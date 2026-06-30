"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductInventory = getProductInventory;
exports.validateOrderInventory = validateOrderInventory;
exports.maybeSendLowStockAlert = maybeSendLowStockAlert;
exports.decrementInventoryForOrder = decrementInventoryForOrder;
exports.syncInventoryAlertState = syncInventoryAlertState;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const shared_1 = require("@onlinesadar/shared");
const db_1 = require("./db");
const email_1 = require("./email");
function aggregateQuantities(items) {
    const map = new Map();
    for (const item of items) {
        const prev = map.get(item.productSlug);
        map.set(item.productSlug, {
            qty: (prev?.qty ?? 0) + item.quantity,
            name: item.name,
        });
    }
    return map;
}
async function getProductInventory(slug) {
    const result = await db_1.docClient.send(new lib_dynamodb_1.GetCommand({
        TableName: db_1.PRODUCTS_TABLE,
        Key: { PK: shared_1.productKeys.pk(slug), SK: shared_1.productKeys.sk() },
    }));
    if (!result.Item)
        return null;
    const inv = result.Item.inventory;
    return typeof inv === "number" ? inv : 0;
}
/** Returns error message if any line item exceeds available stock. */
async function validateOrderInventory(items) {
    const qtyBySlug = aggregateQuantities(items);
    for (const [slug, { qty, name }] of qtyBySlug) {
        const available = await getProductInventory(slug);
        if (available === null)
            return `${name} is no longer available.`;
        if (available <= 0)
            return `${name} is sold out.`;
        if (available < qty) {
            return `Only ${available} left in stock for ${name}. Please reduce quantity.`;
        }
    }
    return null;
}
async function maybeSendLowStockAlert(product, inventory) {
    if (inventory > shared_1.LOW_STOCK_THRESHOLD)
        return;
    if (product.lowStockAlertSentAt)
        return;
    const emailResult = await (0, email_1.notifyLowStock)(product, inventory);
    if (!emailResult.ok) {
        console.error("Low stock email failed:", product.slug, emailResult.error);
        return;
    }
    const timestamp = (0, db_1.now)();
    await db_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
        TableName: db_1.PRODUCTS_TABLE,
        Key: { PK: shared_1.productKeys.pk(product.slug), SK: shared_1.productKeys.sk() },
        UpdateExpression: "SET lowStockAlertSentAt = :at, updatedAt = :now",
        ExpressionAttributeValues: { ":at": timestamp, ":now": timestamp },
    }));
}
/** Decrement stock after payment. Idempotent when called only on first paid transition. */
async function decrementInventoryForOrder(order) {
    const qtyBySlug = aggregateQuantities(order.items);
    const timestamp = (0, db_1.now)();
    for (const [slug, { qty, name }] of qtyBySlug) {
        try {
            const result = await db_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
                TableName: db_1.PRODUCTS_TABLE,
                Key: { PK: shared_1.productKeys.pk(slug), SK: shared_1.productKeys.sk() },
                UpdateExpression: "SET inventory = inventory - :qty, unitsSold = if_not_exists(unitsSold, :zero) + :qty, updatedAt = :now",
                ConditionExpression: "inventory >= :qty",
                ExpressionAttributeValues: { ":qty": qty, ":now": timestamp, ":zero": 0 },
                ReturnValues: "ALL_NEW",
            }));
            const updated = result.Attributes;
            await maybeSendLowStockAlert(updated, updated.inventory);
        }
        catch (err) {
            console.error(`Inventory decrement failed for ${slug} (${name}):`, err);
        }
    }
}
/** Admin restock: clear alert flag when inventory rises above threshold. */
async function syncInventoryAlertState(slug, previous, nextInventory) {
    const timestamp = (0, db_1.now)();
    if (nextInventory > shared_1.LOW_STOCK_THRESHOLD && previous.lowStockAlertSentAt) {
        await db_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
            TableName: db_1.PRODUCTS_TABLE,
            Key: { PK: shared_1.productKeys.pk(slug), SK: shared_1.productKeys.sk() },
            UpdateExpression: "REMOVE lowStockAlertSentAt SET updatedAt = :now",
            ExpressionAttributeValues: { ":now": timestamp },
        }));
        return;
    }
    if (nextInventory <= shared_1.LOW_STOCK_THRESHOLD &&
        nextInventory > 0 &&
        nextInventory < (previous.inventory ?? 0) &&
        !previous.lowStockAlertSentAt) {
        await maybeSendLowStockAlert({ ...previous, inventory: nextInventory }, nextInventory);
    }
}
