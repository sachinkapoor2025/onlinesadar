import { GetCommand, PutCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import {
  sellerDocumentUploadSchema,
  sellerDocKeys,
  sellerKeys,
  SELLER_STATUS,
  SUBSCRIPTION_PRICING_INR,
  recommendSubscriptionPlan,
  productKeys,
  orderKeys,
  ORDER_STATUS,
  type Seller,
  type Product,
} from "@onlinesadar/shared";
import { docClient, SELLERS_TABLE, PRODUCTS_TABLE, ORDERS_TABLE, now } from "../lib/db";
import { ok, created, badRequest, notFound, unauthorized, forbidden } from "../lib/response";
import { getAuth, requireAdmin } from "../lib/auth";

async function getSellerByUserId(userId: string): Promise<(Seller & { PK: string; SK: string }) | null> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: SELLERS_TABLE,
      IndexName: "GSI2",
      KeyConditionExpression: "GSI2PK = :pk AND GSI2SK = :sk",
      ExpressionAttributeValues: { ":pk": sellerKeys.gsi2pk(userId), ":sk": sellerKeys.gsi2sk() },
      Limit: 1,
    })
  );
  return (result.Items?.[0] as Seller & { PK: string; SK: string }) ?? null;
}

export async function uploadSellerDocument(event: APIGatewayProxyEventV2) {
  const auth = getAuth(event);
  if (!auth) return unauthorized();

  const seller = await getSellerByUserId(auth.userId);
  if (!seller) return notFound("Seller profile not found");

  const body = JSON.parse(event.body ?? "{}");
  const parsed = sellerDocumentUploadSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const timestamp = now();
  await docClient.send(
    new PutCommand({
      TableName: SELLERS_TABLE,
      Item: {
        ...parsed.data,
        sellerId: seller.sellerId,
        status: "pending",
        PK: sellerDocKeys.pk(seller.sellerId),
        SK: sellerDocKeys.sk(parsed.data.docType),
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    })
  );

  // Move to pending review when bank + gst uploaded
  const docs = await docClient.send(
    new QueryCommand({
      TableName: SELLERS_TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: {
        ":pk": sellerDocKeys.pk(seller.sellerId),
        ":prefix": "DOC#",
      },
    })
  );
  const docTypes = new Set((docs.Items ?? []).map((d) => d.docType));
  const hasKyc = docTypes.has("gst") && docTypes.has("bank") && docTypes.has("pan");
  if (hasKyc && seller.status === SELLER_STATUS.TRIAL_ACTIVE) {
    await docClient.send(
      new PutCommand({
        TableName: SELLERS_TABLE,
        Item: {
          ...seller,
          status: SELLER_STATUS.PENDING_REVIEW,
          documentsComplete: true,
          updatedAt: timestamp,
        },
      })
    );
  }

  return created({ ok: true });
}

export async function listSellerDocuments(event: APIGatewayProxyEventV2) {
  const auth = getAuth(event);
  if (!auth) return unauthorized();

  const seller = await getSellerByUserId(auth.userId);
  if (!seller && !auth.isAdmin) return forbidden();
  const sellerId = seller?.sellerId ?? event.queryStringParameters?.sellerId;
  if (!sellerId) return notFound("Seller not found");

  const result = await docClient.send(
    new QueryCommand({
      TableName: SELLERS_TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: {
        ":pk": sellerDocKeys.pk(sellerId),
        ":prefix": "DOC#",
      },
    })
  );

  return ok({ documents: result.Items ?? [] });
}

export async function approveSeller(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();

  const sellerId = event.pathParameters?.sellerId;
  if (!sellerId) return badRequest("Seller ID required");

  const result = await docClient.send(
    new GetCommand({
      TableName: SELLERS_TABLE,
      Key: { PK: sellerKeys.pk(sellerId), SK: sellerKeys.sk() },
    })
  );
  if (!result.Item) return notFound("Seller not found");

  const body = JSON.parse(event.body ?? "{}");
  const action = body.action as string;
  const timestamp = now();
  const seller = result.Item as Seller & { PK: string; SK: string };

  if (action === "verify") {
    const updated = {
      ...seller,
      status: SELLER_STATUS.VERIFIED,
      bankVerified: true,
      verifiedAt: timestamp,
      updatedAt: timestamp,
    };
    await docClient.send(new PutCommand({ TableName: SELLERS_TABLE, Item: updated }));
    return ok({ seller: updated });
  }

  if (action === "suspend") {
    const updated = { ...seller, status: SELLER_STATUS.SUSPENDED, updatedAt: timestamp };
    await docClient.send(new PutCommand({ TableName: SELLERS_TABLE, Item: updated }));
    return ok({ seller: updated });
  }

  return badRequest("Invalid action");
}

export async function getSubscriptionInfo(event: APIGatewayProxyEventV2) {
  const auth = getAuth(event);
  if (!auth) return unauthorized();

  const seller = await getSellerByUserId(auth.userId);
  if (!seller) return notFound("Seller profile not found");

  const recommended = recommendSubscriptionPlan(seller.monthlyGmvInr ?? 0);
  const priceInr =
    recommended === "enterprise" ? null : SUBSCRIPTION_PRICING_INR[recommended as keyof typeof SUBSCRIPTION_PRICING_INR];

  return ok({
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

export async function activateSubscription(event: APIGatewayProxyEventV2) {
  const auth = getAuth(event);
  if (!auth) return unauthorized();

  const seller = await getSellerByUserId(auth.userId);
  if (!seller) return notFound("Seller profile not found");

  const body = JSON.parse(event.body ?? "{}");
  const plan = body.plan as "starter" | "growth";
  if (!plan || !SUBSCRIPTION_PRICING_INR[plan]) return badRequest("Invalid plan");

  const timestamp = now();
  const paidUntil = new Date();
  paidUntil.setMonth(paidUntil.getMonth() + 1);

  const updated = {
    ...seller,
    subscriptionPlan: plan,
    subscriptionStatus: "active" as const,
    subscriptionPaidUntil: paidUntil.toISOString(),
    updatedAt: timestamp,
  };

  await docClient.send(new PutCommand({ TableName: SELLERS_TABLE, Item: updated }));
  return ok({
    seller: updated,
    amountInr: SUBSCRIPTION_PRICING_INR[plan],
    message: "Subscription activated. Payment integration via Razorpay subscription coming in production.",
  });
}

export async function getSellerAnalytics(event: APIGatewayProxyEventV2) {
  const auth = getAuth(event);
  if (!auth) return unauthorized();

  const seller = await getSellerByUserId(auth.userId);
  if (!seller && !auth.isAdmin) return forbidden();
  const sellerId = seller?.sellerId ?? event.queryStringParameters?.sellerId;
  if (!sellerId) return notFound("Seller not found");

  const productsResult = await docClient.send(
    new QueryCommand({
      TableName: PRODUCTS_TABLE,
      IndexName: "GSI2",
      KeyConditionExpression: "GSI2PK = :pk",
      ExpressionAttributeValues: { ":pk": productKeys.gsi2pk(sellerId) },
    })
  );
  const products = (productsResult.Items ?? []) as Product[];
  const productViews = products.reduce((sum, p) => sum + (p.unitsSold ?? 0), 0);

  const ordersResult = await docClient.send(
    new ScanCommand({
      TableName: ORDERS_TABLE,
      FilterExpression: "sellerId = :sid",
      ExpressionAttributeValues: { ":sid": sellerId },
      Limit: 500,
    })
  );
  const orders = ordersResult.Items ?? [];
  const paidStatuses: string[] = [ORDER_STATUS.PAID, ORDER_STATUS.TOKEN_PAID, ORDER_STATUS.BALANCE_RECEIVED, ORDER_STATUS.SHIPPED, ORDER_STATUS.DELIVERED, ORDER_STATUS.COMPLETE];
  const revenueInr = orders
    .filter((o) => paidStatuses.includes(o.status as string))
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  return ok({
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
