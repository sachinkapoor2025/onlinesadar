"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processDueReviewEmails = processDueReviewEmails;
exports.applyDeliveryReviewSchedule = applyDeliveryReviewSchedule;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const shared_1 = require("@onlinesadar/shared");
const db_1 = require("../lib/db");
const email_1 = require("../lib/email");
const DELIVERED_STATUSES = [shared_1.ORDER_STATUS.DELIVERED, shared_1.ORDER_STATUS.COMPLETE];
async function queryOrdersByStatus(status) {
    const items = [];
    let lastKey;
    do {
        const res = await db_1.docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: db_1.ORDERS_TABLE,
            IndexName: "GSI3",
            KeyConditionExpression: "GSI3PK = :pk",
            ExpressionAttributeValues: { ":pk": shared_1.orderKeys.gsi3pk(status) },
            ExclusiveStartKey: lastKey,
        }));
        items.push(...(res.Items ?? []));
        lastKey = res.LastEvaluatedKey;
    } while (lastKey);
    return items;
}
async function markReviewEmailSent(orderId, sentAt, dueAt) {
    try {
        await db_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
            TableName: db_1.ORDERS_TABLE,
            Key: { PK: shared_1.orderKeys.pk(orderId), SK: shared_1.orderKeys.sk() },
            UpdateExpression: "SET reviewEmailSentAt = :sent, reviewEmailDueAt = if_not_exists(reviewEmailDueAt, :due), updatedAt = :now",
            ConditionExpression: "attribute_not_exists(reviewEmailSentAt)",
            ExpressionAttributeValues: {
                ":sent": sentAt,
                ":due": dueAt,
                ":now": sentAt,
            },
        }));
        return true;
    }
    catch (err) {
        if (err.name === "ConditionalCheckFailedException")
            return false;
        throw err;
    }
}
async function processOrder(order) {
    const dueAt = (0, shared_1.resolveReviewEmailDueAt)(order);
    if (!dueAt || !(0, shared_1.isReviewEmailDue)(order))
        return "skipped";
    const customerEmail = order.shippingAddress?.email?.trim();
    if (!customerEmail?.includes("@")) {
        console.warn("Review email skipped — no customer email", order.orderId);
        return "skipped";
    }
    const sentAt = (0, db_1.now)();
    const claimed = await markReviewEmailSent(order.orderId, sentAt, dueAt);
    if (!claimed)
        return "skipped";
    const result = await (0, email_1.sendReviewRequestEmail)(order);
    if (result.ok)
        return "sent";
    console.error("Review email failed — clearing sent flag", order.orderId, result.error);
    await db_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
        TableName: db_1.ORDERS_TABLE,
        Key: { PK: shared_1.orderKeys.pk(order.orderId), SK: shared_1.orderKeys.sk() },
        UpdateExpression: "REMOVE reviewEmailSentAt SET updatedAt = :now",
        ExpressionAttributeValues: { ":now": (0, db_1.now)() },
    }));
    return "failed";
}
/** Hourly cron: email customers 1 day after delivery asking for a review. */
async function processDueReviewEmails() {
    const seen = new Set();
    const orders = [];
    for (const status of DELIVERED_STATUSES) {
        for (const order of await queryOrdersByStatus(status)) {
            if (!seen.has(order.orderId)) {
                seen.add(order.orderId);
                orders.push(order);
            }
        }
    }
    let sent = 0;
    let skipped = 0;
    let failed = 0;
    for (const order of orders) {
        const outcome = await processOrder(order);
        if (outcome === "sent")
            sent += 1;
        else if (outcome === "failed")
            failed += 1;
        else
            skipped += 1;
    }
    console.log("Review email cron", { scanned: orders.length, sent, skipped, failed });
    return { scanned: orders.length, sent, skipped, failed };
}
/** Call when admin marks order delivered/complete — sets schedule fields. */
function applyDeliveryReviewSchedule(order, nextStatus, timestamp) {
    if (nextStatus === order.status || !(0, shared_1.isDeliveredStatus)(nextStatus))
        return {};
    const deliveredAt = order.deliveredAt ?? timestamp;
    const patch = {};
    if (!order.deliveredAt)
        patch.deliveredAt = deliveredAt;
    if (!order.reviewEmailSentAt && !order.reviewEmailDueAt) {
        patch.reviewEmailDueAt = (0, shared_1.reviewEmailDueAtFrom)(deliveredAt);
    }
    return patch;
}
