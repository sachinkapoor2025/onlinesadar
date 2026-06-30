"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAbandonedCarts = getAbandonedCarts;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const shared_1 = require("@onlinesadar/shared");
const db_1 = require("../lib/db");
const response_1 = require("../lib/response");
const auth_1 = require("../lib/auth");
/**
 * Abandoned carts = carts that still hold items. A successful checkout clears the
 * cart, so a non-empty cart is one the shopper left behind.
 */
async function getAbandonedCarts(event) {
    if (!(0, auth_1.requireAdmin)(event))
        return (0, response_1.forbidden)();
    const res = await db_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: db_1.CARTS_TABLE,
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :pk",
        ExpressionAttributeValues: { ":pk": shared_1.cartKeys.gsi1pk() },
        ScanIndexForward: false,
        Limit: 300,
    }));
    const carts = (res.Items ?? [])
        .filter((c) => Number(c.itemCount ?? 0) > 0)
        .slice(0, 200)
        .map((c) => ({
        userKey: c.userKey,
        sessionId: c.sessionId,
        itemCount: Number(c.itemCount ?? 0),
        value: Number(c.value ?? 0),
        currency: c.currency,
        createdAt: c.createdAt ?? c.updatedAt ?? "",
        updatedAt: c.updatedAt ?? "",
        items: c.items ?? [],
        abandonedEmail1SentAt: c.abandonedEmail1SentAt,
        abandonedEmail2SentAt: c.abandonedEmail2SentAt,
        recoveryCouponCode: c.recoveryCouponCode,
        convertedOrderId: c.convertedOrderId,
        converted: Boolean(c.convertedOrderId),
    }));
    await Promise.all(carts.map(async (cart) => {
        const sid = cart.sessionId ?? cart.userKey;
        if (!sid)
            return;
        const profile = await db_1.docClient.send(new lib_dynamodb_1.GetCommand({
            TableName: db_1.CUSTOMERS_TABLE,
            Key: { PK: shared_1.customerKeys.pk(sid), SK: shared_1.customerKeys.profileSk() },
        }));
        if (profile.Item) {
            cart.name = profile.Item.name;
            cart.email = profile.Item.email;
            cart.phone = profile.Item.phone;
        }
    }));
    return (0, response_1.ok)({ carts });
}
