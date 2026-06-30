"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSalesReport = getSalesReport;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const shared_1 = require("@onlinesadar/shared");
const db_1 = require("../lib/db");
const response_1 = require("../lib/response");
const auth_1 = require("../lib/auth");
async function fetchOrdersSince(isoFrom) {
    const items = [];
    let lastKey;
    do {
        const res = await db_1.docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: db_1.ORDERS_TABLE,
            IndexName: "GSI2",
            KeyConditionExpression: "GSI2PK = :pk AND GSI2SK >= :from",
            ExpressionAttributeValues: {
                ":pk": shared_1.orderKeys.gsi2pk(),
                ":from": isoFrom,
            },
            ExclusiveStartKey: lastKey,
            ScanIndexForward: false,
        }));
        items.push(...(res.Items ?? []));
        lastKey = res.LastEvaluatedKey;
    } while (lastKey);
    return items;
}
function toOrderRow(order, paidAt) {
    return {
        orderId: order.orderId,
        paidAt,
        customerName: order.shippingAddress?.name ?? "—",
        email: order.shippingAddress?.email ?? "—",
        total: order.total,
        currency: order.currency,
        status: order.status,
        paymentProvider: order.paymentProvider,
        itemCount: order.items.reduce((n, i) => n + i.quantity, 0),
    };
}
function buildPeriodReport(period, orders, now = new Date()) {
    const { from, to, label } = (0, shared_1.periodRange)(period, now);
    const fromMs = from.getTime();
    const toMs = to.getTime();
    const excluded = { refunded: 0, cancelled: 0, pendingPayment: 0 };
    const revenueOrders = [];
    for (const order of orders) {
        const orderMs = new Date(order.createdAt).getTime();
        if (orderMs < fromMs || orderMs > toMs)
            continue;
        if (order.status === shared_1.ORDER_STATUS.REFUNDED) {
            excluded.refunded += 1;
            continue;
        }
        if (order.status === shared_1.ORDER_STATUS.CANCELLED) {
            excluded.cancelled += 1;
            continue;
        }
        if (order.status === shared_1.ORDER_STATUS.PENDING_PAYMENT) {
            excluded.pendingPayment += 1;
            continue;
        }
        if (!(0, shared_1.isRevenueOrder)(order.status))
            continue;
        const paidAt = (0, shared_1.getOrderPaidAt)(order);
        if (!paidAt)
            continue;
        const paidMs = new Date(paidAt).getTime();
        if (paidMs < fromMs || paidMs > toMs)
            continue;
        revenueOrders.push({ order, paidAt });
    }
    revenueOrders.sort((a, b) => b.paidAt.localeCompare(a.paidAt));
    let revenueUSD = 0;
    let revenueINR = 0;
    const bucketMap = new Map();
    for (const { order, paidAt } of revenueOrders) {
        if (order.currency === "USD")
            revenueUSD += order.total;
        else
            revenueINR += order.total;
        const date = (0, db_1.dayBucket)(new Date(paidAt));
        const bucket = bucketMap.get(date) ?? {
            label: date,
            date,
            orderCount: 0,
            revenueUSD: 0,
            revenueINR: 0,
        };
        bucket.orderCount += 1;
        if (order.currency === "USD")
            bucket.revenueUSD += order.total;
        else
            bucket.revenueINR += order.total;
        bucketMap.set(date, bucket);
    }
    const breakdown = [...bucketMap.values()].sort((a, b) => a.date.localeCompare(b.date));
    return {
        period,
        label,
        from: from.toISOString(),
        to: to.toISOString(),
        orderCount: revenueOrders.length,
        revenueUSD,
        revenueINR,
        excluded,
        breakdown,
        orders: revenueOrders.map(({ order, paidAt }) => toOrderRow(order, paidAt)),
    };
}
async function getSalesReport(event) {
    if (!(0, auth_1.requireAdmin)(event))
        return (0, response_1.forbidden)();
    const now = new Date();
    const monthRange = (0, shared_1.periodRange)("month", now);
    const orders = await fetchOrdersSince(monthRange.from.toISOString());
    const response = {
        generatedAt: now.toISOString(),
        day: buildPeriodReport("day", orders, now),
        week: buildPeriodReport("week", orders, now),
        month: buildPeriodReport("month", orders, now),
    };
    return (0, response_1.ok)(response);
}
