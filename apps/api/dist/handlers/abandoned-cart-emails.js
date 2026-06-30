"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ABANDONED_CART_DISCOUNT_EXPORT = exports.ABANDONED_CART_COUPON_HOURS_EXPORT = void 0;
exports.processAbandonedCartEmails = processAbandonedCartEmails;
exports.markCartConverted = markCartConverted;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const shared_1 = require("@onlinesadar/shared");
const db_1 = require("../lib/db");
const coupons_1 = require("./coupons");
const email_1 = require("../lib/email");
const MS_15_MIN = shared_1.ABANDONED_CART_EMAIL_1_MINUTES * 60 * 1000;
const MS_4_HOURS = shared_1.ABANDONED_CART_EMAIL_2_HOURS * 60 * 60 * 1000;
async function loadProfile(sessionId) {
    const res = await db_1.docClient.send(new lib_dynamodb_1.GetCommand({
        TableName: db_1.CUSTOMERS_TABLE,
        Key: { PK: shared_1.customerKeys.pk(sessionId), SK: shared_1.customerKeys.profileSk() },
    }));
    return res.Item;
}
async function hasPaidOrderForSession(sessionId, sinceIso) {
    const res = await db_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: db_1.ORDERS_TABLE,
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :pk AND GSI1SK >= :since",
        FilterExpression: "#st <> :pending AND #st <> :cancelled",
        ExpressionAttributeNames: { "#st": "status" },
        ExpressionAttributeValues: {
            ":pk": shared_1.orderKeys.gsi1pk(sessionId),
            ":since": sinceIso,
            ":pending": shared_1.ORDER_STATUS.PENDING_PAYMENT,
            ":cancelled": shared_1.ORDER_STATUS.CANCELLED,
        },
        ScanIndexForward: false,
        Limit: 5,
    }));
    const paid = (res.Items ?? []).find((o) => o.status === shared_1.ORDER_STATUS.PAID || o.status === shared_1.ORDER_STATUS.PROCESSING);
    return paid?.orderId;
}
async function markEmailSent(userKey, field, couponCode) {
    const timestamp = (0, db_1.now)();
    await db_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
        TableName: db_1.CARTS_TABLE,
        Key: { PK: shared_1.cartKeys.pk(userKey), SK: shared_1.cartKeys.sk() },
        UpdateExpression: couponCode
            ? `SET ${field} = :ts, recoveryCouponCode = :code, updatedAt = :ts`
            : `SET ${field} = :ts, updatedAt = :ts`,
        ExpressionAttributeValues: {
            ":ts": timestamp,
            ...(couponCode ? { ":code": couponCode } : {}),
        },
    }));
}
async function processCart(cart) {
    if ((cart.itemCount ?? 0) <= 0)
        return "skipped";
    if (cart.convertedOrderId)
        return "skipped";
    const sessionId = cart.sessionId ?? cart.userKey;
    const profile = await loadProfile(sessionId);
    const email = profile?.email?.trim();
    if (!email?.includes("@"))
        return "skipped";
    const createdAt = cart.createdAt ?? cart.updatedAt;
    const converted = await hasPaidOrderForSession(sessionId, createdAt);
    if (converted) {
        await db_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
            TableName: db_1.CARTS_TABLE,
            Key: { PK: shared_1.cartKeys.pk(cart.userKey), SK: shared_1.cartKeys.sk() },
            UpdateExpression: "SET convertedOrderId = :oid, updatedAt = :now",
            ExpressionAttributeValues: { ":oid": converted, ":now": (0, db_1.now)() },
        }));
        return "skipped";
    }
    const idleMs = Date.now() - new Date(cart.updatedAt).getTime();
    const name = profile?.name?.split(" ")[0] ?? "there";
    if (!cart.abandonedEmail1SentAt && idleMs >= MS_15_MIN) {
        const coupon = await (0, coupons_1.issueAbandonedCartCoupon)({ email, sessionId });
        const result = await (0, email_1.sendAbandonedCartEmail)({
            email,
            name,
            items: cart.items ?? [],
            value: cart.value ?? 0,
            currency: cart.currency ?? "USD",
            couponCode: coupon.code,
            expiresAt: coupon.expiresAt,
            reminder: 1,
        });
        if (result.ok) {
            await markEmailSent(cart.userKey, "abandonedEmail1SentAt", coupon.code);
            return "sent1";
        }
        return "skipped";
    }
    if (cart.abandonedEmail1SentAt &&
        !cart.abandonedEmail2SentAt &&
        idleMs >= MS_4_HOURS) {
        const coupon = cart.recoveryCouponCode
            ? { code: cart.recoveryCouponCode, expiresAt: "" }
            : await (0, coupons_1.issueAbandonedCartCoupon)({ email, sessionId });
        const result = await (0, email_1.sendAbandonedCartEmail)({
            email,
            name,
            items: cart.items ?? [],
            value: cart.value ?? 0,
            currency: cart.currency ?? "USD",
            couponCode: coupon.code,
            expiresAt: coupon.expiresAt,
            reminder: 2,
        });
        if (result.ok) {
            await markEmailSent(cart.userKey, "abandonedEmail2SentAt");
            return "sent2";
        }
    }
    return "skipped";
}
/** Every 15 min: email 1 at 15 min idle; email 2 at 4 h idle with 10% coupon (4 h validity). */
async function processAbandonedCartEmails() {
    const res = await db_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: db_1.CARTS_TABLE,
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :pk",
        ExpressionAttributeValues: { ":pk": shared_1.cartKeys.gsi1pk() },
        ScanIndexForward: false,
        Limit: 300,
    }));
    const carts = (res.Items ?? []).filter((c) => (c.itemCount ?? 0) > 0);
    let sent1 = 0;
    let sent2 = 0;
    let skipped = 0;
    for (const cart of carts) {
        const outcome = await processCart(cart);
        if (outcome === "sent1")
            sent1 += 1;
        else if (outcome === "sent2")
            sent2 += 1;
        else
            skipped += 1;
    }
    console.log("Abandoned cart email cron", { scanned: carts.length, sent1, sent2, skipped });
    return { scanned: carts.length, sent1, sent2, skipped };
}
/** Mark cart converted when order is paid. */
async function markCartConverted(sessionId, orderId) {
    if (!sessionId)
        return;
    await db_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
        TableName: db_1.CARTS_TABLE,
        Key: { PK: shared_1.cartKeys.pk(sessionId), SK: shared_1.cartKeys.sk() },
        UpdateExpression: "SET convertedOrderId = :oid, updatedAt = :now",
        ExpressionAttributeValues: { ":oid": orderId, ":now": (0, db_1.now)() },
    })).catch(() => {
        /* cart may already be cleared */
    });
}
exports.ABANDONED_CART_COUPON_HOURS_EXPORT = shared_1.ABANDONED_CART_COUPON_HOURS;
exports.ABANDONED_CART_DISCOUNT_EXPORT = shared_1.ABANDONED_CART_DISCOUNT_PERCENT;
