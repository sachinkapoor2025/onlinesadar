import { v4 as uuidv4 } from "uuid";
import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import {
  rfqCreateSchema,
  rfqKeys,
  productKeys,
  sellerKeys,
  type Rfq,
  type Product,
} from "@onlinesadar/shared";
import { docClient, PRODUCTS_TABLE, SELLERS_TABLE, now } from "../lib/db";
import { ok, created, badRequest, notFound, unauthorized, forbidden } from "../lib/response";
import { getAuth } from "../lib/auth";

async function getSellerByUserId(userId: string) {
  const result = await docClient.send(
    new QueryCommand({
      TableName: SELLERS_TABLE,
      IndexName: "GSI2",
      KeyConditionExpression: "GSI2PK = :pk AND GSI2SK = :sk",
      ExpressionAttributeValues: { ":pk": sellerKeys.gsi2pk(userId), ":sk": sellerKeys.gsi2sk() },
      Limit: 1,
    })
  );
  return result.Items?.[0] as { sellerId: string; businessName: string } | undefined;
}

export async function createRfq(event: APIGatewayProxyEventV2) {
  const body = JSON.parse(event.body ?? "{}");
  const parsed = rfqCreateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const productResult = await docClient.send(
    new GetCommand({
      TableName: PRODUCTS_TABLE,
      Key: { PK: productKeys.pk(parsed.data.productSlug), SK: productKeys.sk() },
    })
  );
  if (!productResult.Item) return notFound("Product not found");
  const product = productResult.Item as Product;
  if (!product.sellerId) return badRequest("This product does not support RFQ");

  const rfqId = uuidv4();
  const timestamp = now();

  const rfq: Rfq & { PK: string; SK: string; GSI1PK: string; GSI1SK: string } = {
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
    PK: rfqKeys.pk(product.sellerId),
    SK: rfqKeys.sk(timestamp, rfqId),
    GSI1PK: rfqKeys.gsi1pk(),
    GSI1SK: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await docClient.send(new PutCommand({ TableName: SELLERS_TABLE, Item: rfq }));
  return created({ rfq });
}

export async function listSellerRfqs(event: APIGatewayProxyEventV2) {
  const auth = getAuth(event);
  if (!auth) return unauthorized();

  const seller = await getSellerByUserId(auth.userId);
  if (!seller && !auth.isAdmin) return forbidden();

  const sellerId = seller?.sellerId ?? event.queryStringParameters?.sellerId;
  if (!sellerId) return badRequest("Seller not found");

  const result = await docClient.send(
    new QueryCommand({
      TableName: SELLERS_TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: { ":pk": rfqKeys.pk(sellerId), ":prefix": "RFQ#" },
      ScanIndexForward: false,
      Limit: 100,
    })
  );

  return ok({ rfqs: result.Items ?? [] });
}

export async function respondToRfq(event: APIGatewayProxyEventV2) {
  const auth = getAuth(event);
  if (!auth) return unauthorized();

  const rfqId = event.pathParameters?.rfqId;
  if (!rfqId) return badRequest("RFQ ID required");

  const body = JSON.parse(event.body ?? "{}");
  const response = typeof body.response === "string" ? body.response.trim() : "";
  if (!response) return badRequest("Response required");

  const seller = await getSellerByUserId(auth.userId);
  if (!seller && !auth.isAdmin) return forbidden();

  const result = await docClient.send(
    new QueryCommand({
      TableName: SELLERS_TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: {
        ":pk": rfqKeys.pk(seller!.sellerId),
        ":prefix": "RFQ#",
      },
      ScanIndexForward: false,
    })
  );

  const rfq = (result.Items ?? []).find((i) => i.rfqId === rfqId) as Rfq & { PK: string; SK: string };
  if (!rfq) return notFound("RFQ not found");

  const timestamp = now();
  const updated = {
    ...rfq,
    status: "responded" as const,
    sellerResponse: response,
    updatedAt: timestamp,
  };

  await docClient.send(new PutCommand({ TableName: SELLERS_TABLE, Item: updated }));
  return ok({ rfq: updated });
}
