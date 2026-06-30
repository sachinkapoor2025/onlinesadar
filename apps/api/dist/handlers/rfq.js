"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRfq = createRfq;
exports.listSellerRfqs = listSellerRfqs;
exports.respondToRfq = respondToRfq;
const uuid_1 = require("uuid");
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
    return result.Items?.[0];
}
async function createRfq(event) {
    const body = JSON.parse(event.body ?? "{}");
    const parsed = shared_1.rfqCreateSchema.safeParse(body);
    if (!parsed.success)
        return (0, response_1.badRequest)(parsed.error.message);
    const productResult = await db_1.docClient.send(new lib_dynamodb_1.GetCommand({
        TableName: db_1.PRODUCTS_TABLE,
        Key: { PK: shared_1.productKeys.pk(parsed.data.productSlug), SK: shared_1.productKeys.sk() },
    }));
    if (!productResult.Item)
        return (0, response_1.notFound)("Product not found");
    const product = productResult.Item;
    if (!product.sellerId)
        return (0, response_1.badRequest)("This product does not support RFQ");
    const rfqId = (0, uuid_1.v4)();
    const timestamp = (0, db_1.now)();
    const rfq = {
        rfqId,
        productSlug: product.slug,
        productName: product.name,
        sellerId: product.sellerId,
        buyerName: parsed.data.buyerName,
        buyerEmail: parsed.data.buyerEmail,
        buyerPhone: parsed.data.buyerPhone,
        quantity: parsed.data.quantity,
        message: parsed.data.message,
        status: "open",
        PK: shared_1.rfqKeys.pk(product.sellerId),
        SK: shared_1.rfqKeys.sk(timestamp, rfqId),
        GSI1PK: shared_1.rfqKeys.gsi1pk(),
        GSI1SK: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
    };
    await db_1.docClient.send(new lib_dynamodb_1.PutCommand({ TableName: db_1.SELLERS_TABLE, Item: rfq }));
    return (0, response_1.created)({ rfq });
}
async function listSellerRfqs(event) {
    const auth = (0, auth_1.getAuth)(event);
    if (!auth)
        return (0, response_1.unauthorized)();
    const seller = await getSellerByUserId(auth.userId);
    if (!seller && !auth.isAdmin)
        return (0, response_1.forbidden)();
    const sellerId = seller?.sellerId ?? event.queryStringParameters?.sellerId;
    if (!sellerId)
        return (0, response_1.badRequest)("Seller not found");
    const result = await db_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: db_1.SELLERS_TABLE,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: { ":pk": shared_1.rfqKeys.pk(sellerId), ":prefix": "RFQ#" },
        ScanIndexForward: false,
        Limit: 100,
    }));
    return (0, response_1.ok)({ rfqs: result.Items ?? [] });
}
async function respondToRfq(event) {
    const auth = (0, auth_1.getAuth)(event);
    if (!auth)
        return (0, response_1.unauthorized)();
    const rfqId = event.pathParameters?.rfqId;
    if (!rfqId)
        return (0, response_1.badRequest)("RFQ ID required");
    const body = JSON.parse(event.body ?? "{}");
    const response = typeof body.response === "string" ? body.response.trim() : "";
    if (!response)
        return (0, response_1.badRequest)("Response required");
    const seller = await getSellerByUserId(auth.userId);
    if (!seller && !auth.isAdmin)
        return (0, response_1.forbidden)();
    const result = await db_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: db_1.SELLERS_TABLE,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: {
            ":pk": shared_1.rfqKeys.pk(seller.sellerId),
            ":prefix": "RFQ#",
        },
        ScanIndexForward: false,
    }));
    const rfq = (result.Items ?? []).find((i) => i.rfqId === rfqId);
    if (!rfq)
        return (0, response_1.notFound)("RFQ not found");
    const timestamp = (0, db_1.now)();
    const updated = {
        ...rfq,
        status: "responded",
        sellerResponse: response,
        updatedAt: timestamp,
    };
    await db_1.docClient.send(new lib_dynamodb_1.PutCommand({ TableName: db_1.SELLERS_TABLE, Item: updated }));
    return (0, response_1.ok)({ rfq: updated });
}
