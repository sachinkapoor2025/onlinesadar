"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadSellerDocument = uploadSellerDocument;
exports.listSellerDocuments = listSellerDocuments;
exports.approveSeller = approveSeller;
exports.getSubscriptionInfo = getSubscriptionInfo;
exports.activateSubscription = activateSubscription;
exports.getSellerAnalytics = getSellerAnalytics;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const shared_1 = require("@onlinesadar/shared");
const db_1 = require("../lib/db");
const response_1 = require("../lib/response");
const auth_1 = require("../lib/auth");
async function getSellerByUserId(userId) {
    const result = await db_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: db_1.SELLERS_TABLE,
        IndexName: "GSI2",
        KeyConditionExpression: "GSI2PK = :pk AND GSI2SK = :sk",
        ExpressionAttributeValues: { ":pk": shared_1.sellerKeys.gsi2pk(userId), ":sk": shared_1.sellerKeys.gsi2sk() },
        Limit: 1,
    }));
    return result.Items?.[0] ?? null;
}
async function uploadSellerDocument(event) {
    const auth = (0, auth_1.getAuth)(event);
    if (!auth)
        return (0, response_1.unauthorized)();
    const seller = await getSellerByUserId(auth.userId);
    if (!seller)
        return (0, response_1.notFound)("Seller profile not found");
    const body = JSON.parse(event.body ?? "{}");
    const parsed = shared_1.sellerDocumentUploadSchema.safeParse(body);
    if (!parsed.success)
        return (0, response_1.badRequest)(parsed.error.message);
    const timestamp = (0, db_1.now)();
    await db_1.docClient.send(new lib_dynamodb_1.PutCommand({
        TableName: db_1.SELLERS_TABLE,
        Item: {
            ...parsed.data,
            sellerId: seller.sellerId,
            status: "pending",
            PK: shared_1.sellerDocKeys.pk(seller.sellerId),
            SK: shared_1.sellerDocKeys.sk(parsed.data.docType),
            createdAt: timestamp,
            updatedAt: timestamp,
        },
    }));
    // Move to pending review when bank + gst uploaded
    const docs = await db_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: db_1.SELLERS_TABLE,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: {
            ":pk": shared_1.sellerDocKeys.pk(seller.sellerId),
            ":prefix": "DOC#",
        },
    }));
    const docTypes = new Set((docs.Items ?? []).map((d) => d.docType));
    const hasKyc = docTypes.has("gst") && docTypes.has("bank") && docTypes.has("pan");
    if (hasKyc && seller.status === shared_1.SELLER_STATUS.TRIAL_ACTIVE) {
        await db_1.docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: db_1.SELLERS_TABLE,
            Item: {
                ...seller,
                status: shared_1.SELLER_STATUS.PENDING_REVIEW,
                documentsComplete: true,
                updatedAt: timestamp,
            },
        }));
    }
    return (0, response_1.created)({ ok: true });
}
async function listSellerDocuments(event) {
    const auth = (0, auth_1.getAuth)(event);
    if (!auth)
        return (0, response_1.unauthorized)();
    const seller = await getSellerByUserId(auth.userId);
    if (!seller && !auth.isAdmin)
        return (0, response_1.forbidden)();
    const sellerId = seller?.sellerId ?? event.queryStringParameters?.sellerId;
    if (!sellerId)
        return (0, response_1.notFound)("Seller not found");
    const result = await db_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: db_1.SELLERS_TABLE,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: {
            ":pk": shared_1.sellerDocKeys.pk(sellerId),
            ":prefix": "DOC#",
        },
    }));
    return (0, response_1.ok)({ documents: result.Items ?? [] });
}
async function approveSeller(event) {
    if (!(0, auth_1.requireAdmin)(event))
        return (0, response_1.forbidden)();
    const sellerId = event.pathParameters?.sellerId;
    if (!sellerId)
        return (0, response_1.badRequest)("Seller ID required");
    const result = await db_1.docClient.send(new lib_dynamodb_1.GetCommand({
        TableName: db_1.SELLERS_TABLE,
        Key: { PK: shared_1.sellerKeys.pk(sellerId), SK: shared_1.sellerKeys.sk() },
    }));
    if (!result.Item)
        return (0, response_1.notFound)("Seller not found");
    const body = JSON.parse(event.body ?? "{}");
    const action = body.action;
    const timestamp = (0, db_1.now)();
    const seller = result.Item;
    if (action === "verify") {
        const updated = {
            ...seller,
            status: shared_1.SELLER_STATUS.VERIFIED,
            bankVerified: true,
            verifiedAt: timestamp,
            updatedAt: timestamp,
        };
        await db_1.docClient.send(new lib_dynamodb_1.PutCommand({ TableName: db_1.SELLERS_TABLE, Item: updated }));
        return (0, response_1.ok)({ seller: updated });
    }
    if (action === "suspend") {
        const updated = { ...seller, status: shared_1.SELLER_STATUS.SUSPENDED, updatedAt: timestamp };
        await db_1.docClient.send(new lib_dynamodb_1.PutCommand({ TableName: db_1.SELLERS_TABLE, Item: updated }));
        return (0, response_1.ok)({ seller: updated });
    }
    return (0, response_1.badRequest)("Invalid action");
}
async function getSubscriptionInfo(event) {
    const auth = (0, auth_1.getAuth)(event);
    if (!auth)
        return (0, response_1.unauthorized)();
    const seller = await getSellerByUserId(auth.userId);
    if (!seller)
        return (0, response_1.notFound)("Seller profile not found");
    const recommended = (0, shared_1.recommendSubscriptionPlan)(seller.monthlyGmvInr ?? 0);
    const priceInr = recommended === "enterprise" ? null : shared_1.SUBSCRIPTION_PRICING_INR[recommended];
    return (0, response_1.ok)({
        seller: {
            subscriptionPlan: seller.subscriptionPlan,
            subscriptionStatus: seller.subscriptionStatus,
            subscriptionPaidUntil: seller.subscriptionPaidUntil,
            trialEndsAt: seller.trialEndsAt,
            monthlyGmvInr: seller.monthlyGmvInr,
        },
        recommendedPlan: recommended,
        priceInr,
    });
}
async function activateSubscription(event) {
    const auth = (0, auth_1.getAuth)(event);
    if (!auth)
        return (0, response_1.unauthorized)();
    const seller = await getSellerByUserId(auth.userId);
    if (!seller)
        return (0, response_1.notFound)("Seller profile not found");
    const body = JSON.parse(event.body ?? "{}");
    const plan = body.plan;
    if (!plan || !shared_1.SUBSCRIPTION_PRICING_INR[plan])
        return (0, response_1.badRequest)("Invalid plan");
    const timestamp = (0, db_1.now)();
    const paidUntil = new Date();
    paidUntil.setMonth(paidUntil.getMonth() + 1);
    const updated = {
        ...seller,
        subscriptionPlan: plan,
        subscriptionStatus: "active",
        subscriptionPaidUntil: paidUntil.toISOString(),
        updatedAt: timestamp,
    };
    await db_1.docClient.send(new lib_dynamodb_1.PutCommand({ TableName: db_1.SELLERS_TABLE, Item: updated }));
    return (0, response_1.ok)({
        seller: updated,
        amountInr: shared_1.SUBSCRIPTION_PRICING_INR[plan],
        message: "Subscription activated. Payment integration via Razorpay subscription coming in production.",
    });
}
async function getSellerAnalytics(event) {
    const auth = (0, auth_1.getAuth)(event);
    if (!auth)
        return (0, response_1.unauthorized)();
    const seller = await getSellerByUserId(auth.userId);
    if (!seller && !auth.isAdmin)
        return (0, response_1.forbidden)();
    const sellerId = seller?.sellerId ?? event.queryStringParameters?.sellerId;
    if (!sellerId)
        return (0, response_1.notFound)("Seller not found");
    const productsResult = await db_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: db_1.PRODUCTS_TABLE,
        IndexName: "GSI2",
        KeyConditionExpression: "GSI2PK = :pk",
        ExpressionAttributeValues: { ":pk": shared_1.productKeys.gsi2pk(sellerId) },
    }));
    const products = (productsResult.Items ?? []);
    const productViews = products.reduce((sum, p) => sum + (p.unitsSold ?? 0), 0);
    const ordersResult = await db_1.docClient.send(new lib_dynamodb_1.ScanCommand({
        TableName: db_1.ORDERS_TABLE,
        FilterExpression: "sellerId = :sid",
        ExpressionAttributeValues: { ":sid": sellerId },
        Limit: 500,
    }));
    const orders = ordersResult.Items ?? [];
    const paidStatuses = [shared_1.ORDER_STATUS.PAID, shared_1.ORDER_STATUS.TOKEN_PAID, shared_1.ORDER_STATUS.BALANCE_RECEIVED, shared_1.ORDER_STATUS.SHIPPED, shared_1.ORDER_STATUS.DELIVERED, shared_1.ORDER_STATUS.COMPLETE];
    const revenueInr = orders
        .filter((o) => paidStatuses.includes(o.status))
        .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    return (0, response_1.ok)({
        analytics: {
            productCount: products.length,
            totalUnitsSold: productViews,
            orderCount: orders.length,
            revenueInr,
            topProducts: products
                .sort((a, b) => (b.unitsSold ?? 0) - (a.unitsSold ?? 0))
                .slice(0, 5)
                .map((p) => ({ slug: p.slug, name: p.name, unitsSold: p.unitsSold ?? 0 })),
        },
    });
}
