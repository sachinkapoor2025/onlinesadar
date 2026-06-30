import { randomBytes } from "crypto";
import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import {
  sellerRegisterSchema,
  sellerProfileUpdateSchema,
  sellerKeys,
  sellerTrialCouponKeys,
  SELLER_STATUS,
  SELLER_TRIAL_DAYS,
  SELLER_TRIAL_COUPON_HOURS,
  type Seller,
} from "@onlinesadar/shared";
import { docClient, SELLERS_TABLE, CONFIG_TABLE, now, slugify } from "../lib/db";
import { ok, created, badRequest, notFound, forbidden, unauthorized } from "../lib/response";
import { getAuth, requireAdmin } from "../lib/auth";

function trialEndsAt(): string {
  const d = new Date();
  d.setDate(d.getDate() + SELLER_TRIAL_DAYS);
  return d.toISOString();
}

function generateTrialCouponCode(): string {
  return `SELLER-${randomBytes(4).toString("hex").toUpperCase()}`;
}

async function getSellerByUserId(userId: string): Promise<(Seller & { PK: string; SK: string }) | null> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: SELLERS_TABLE,
      IndexName: "GSI2",
      KeyConditionExpression: "GSI2PK = :pk AND GSI2SK = :sk",
      ExpressionAttributeValues: {
        ":pk": sellerKeys.gsi2pk(userId),
        ":sk": sellerKeys.gsi2sk(),
      },
      Limit: 1,
    })
  );
  return (result.Items?.[0] as Seller & { PK: string; SK: string }) ?? null;
}

export async function getSellerProfile(event: APIGatewayProxyEventV2) {
  const auth = getAuth(event);
  if (!auth) return unauthorized();

  const seller = await getSellerByUserId(auth.userId);
  if (!seller) return notFound("Seller profile not found");
  return ok({ seller });
}

export async function registerSeller(event: APIGatewayProxyEventV2) {
  const auth = getAuth(event);
  if (!auth) return unauthorized();

  const existing = await getSellerByUserId(auth.userId);
  if (existing) return badRequest("Seller account already exists");

  const body = JSON.parse(event.body ?? "{}");
  const parsed = sellerRegisterSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  if (parsed.data.trialCouponCode) {
    const couponResult = await docClient.send(
      new GetCommand({
        TableName: CONFIG_TABLE,
        Key: {
          PK: sellerTrialCouponKeys.pk(parsed.data.trialCouponCode),
          SK: sellerTrialCouponKeys.sk(),
        },
      })
    );
    const coupon = couponResult.Item as { expiresAt?: string; usedAt?: string; email?: string } | undefined;
    if (!coupon) return badRequest("Invalid trial coupon code");
    if (coupon.usedAt) return badRequest("Trial coupon already used");
    if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
      return badRequest("Trial coupon expired");
    }
    if (coupon.email && coupon.email !== auth.email.toLowerCase()) {
      return badRequest("Trial coupon is registered to a different email");
    }
    await docClient.send(
      new UpdateCommand({
        TableName: CONFIG_TABLE,
        Key: {
          PK: sellerTrialCouponKeys.pk(parsed.data.trialCouponCode),
          SK: sellerTrialCouponKeys.sk(),
        },
        UpdateExpression: "SET usedAt = :at, userId = :uid",
        ExpressionAttributeValues: { ":at": now(), ":uid": auth.userId },
      })
    );
  }

  const sellerId = `sel_${randomBytes(8).toString("hex")}`;
  const slug = slugify(parsed.data.businessName);
  const timestamp = now();
  const { trialCouponCode: _coupon, ...profile } = parsed.data;

  const seller: Seller & {
    PK: string;
    SK: string;
    GSI1PK: string;
    GSI1SK: string;
    GSI2PK: string;
    GSI2SK: string;
  } = {
    ...profile,
    sellerId,
    userId: auth.userId,
    email: auth.email,
    slug,
    status: SELLER_STATUS.TRIAL_ACTIVE,
    subscriptionPlan: "trial",
    subscriptionStatus: "trial" as const,
    bankVerified: false,
    documentsComplete: false,
    monthlyGmvInr: 0,
    productCount: 0,
    trialEndsAt: trialEndsAt(),
    PK: sellerKeys.pk(sellerId),
    SK: sellerKeys.sk(),
    GSI1PK: sellerKeys.gsi1pk(),
    GSI1SK: timestamp,
    GSI2PK: sellerKeys.gsi2pk(auth.userId),
    GSI2SK: sellerKeys.gsi2sk(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await docClient.send(new PutCommand({ TableName: SELLERS_TABLE, Item: seller }));
  await docClient.send(
    new PutCommand({
      TableName: SELLERS_TABLE,
      Item: {
        PK: sellerKeys.slugPk(slug),
        SK: sellerKeys.slugSk(),
        sellerId,
        updatedAt: timestamp,
      },
    })
  );

  return created({ seller });
}

export async function updateSellerProfile(event: APIGatewayProxyEventV2) {
  const auth = getAuth(event);
  if (!auth) return unauthorized();

  const seller = await getSellerByUserId(auth.userId);
  if (!seller) return notFound("Seller profile not found");

  const body = JSON.parse(event.body ?? "{}");
  const parsed = sellerProfileUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const updated = {
    ...seller,
    ...parsed.data,
    updatedAt: now(),
  };

  await docClient.send(new PutCommand({ TableName: SELLERS_TABLE, Item: updated }));
  return ok({ seller: updated });
}

/** Issue a 4-hour seller trial signup coupon (public — same pattern as welcome coupon). */
export async function issueSellerTrialCoupon(event: APIGatewayProxyEventV2) {
  const body = JSON.parse(event.body ?? "{}");
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !email.includes("@")) return badRequest("Valid email required");

  const existingEmail = await docClient.send(
    new GetCommand({
      TableName: CONFIG_TABLE,
      Key: { PK: sellerTrialCouponKeys.emailPk(email), SK: sellerTrialCouponKeys.emailSk() },
    })
  );
  if (existingEmail.Item) {
    const active = existingEmail.Item as { code: string; expiresAt: string };
    if (new Date(active.expiresAt).getTime() > Date.now()) {
      return ok({ code: active.code, expiresAt: active.expiresAt, reused: true });
    }
  }

  const code = generateTrialCouponCode();
  const expiresAt = new Date(Date.now() + SELLER_TRIAL_COUPON_HOURS * 60 * 60 * 1000).toISOString();
  const timestamp = now();

  const couponItem = {
    code,
    email,
    expiresAt,
    createdAt: timestamp,
    PK: sellerTrialCouponKeys.pk(code),
    SK: sellerTrialCouponKeys.sk(),
  };

  await docClient.send(
    new PutCommand({
      TableName: CONFIG_TABLE,
      Item: {
        PK: sellerTrialCouponKeys.emailPk(email),
        SK: sellerTrialCouponKeys.emailSk(),
        code,
        expiresAt,
        createdAt: timestamp,
      },
    })
  );
  await docClient.send(new PutCommand({ TableName: CONFIG_TABLE, Item: couponItem }));

  return created({ code, expiresAt, hoursValid: SELLER_TRIAL_COUPON_HOURS });
}

export async function listAdminSellers(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();

  const result = await docClient.send(
    new QueryCommand({
      TableName: SELLERS_TABLE,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: { ":pk": sellerKeys.gsi1pk() },
      ScanIndexForward: false,
      Limit: 200,
    })
  );

  const sellers = (result.Items ?? []).filter((i) => i.sellerId) as Seller[];
  return ok({ sellers });
}

export async function getPublicSeller(event: APIGatewayProxyEventV2) {
  const slug = event.pathParameters?.slug;
  if (!slug) return badRequest("Slug required");

  const slugRef = await docClient.send(
    new GetCommand({
      TableName: SELLERS_TABLE,
      Key: { PK: sellerKeys.slugPk(slug), SK: sellerKeys.slugSk() },
    })
  );
  if (!slugRef.Item?.sellerId) return notFound("Seller not found");

  const result = await docClient.send(
    new GetCommand({
      TableName: SELLERS_TABLE,
      Key: { PK: sellerKeys.pk(slugRef.Item.sellerId as string), SK: sellerKeys.sk() },
    })
  );
  if (!result.Item) return notFound("Seller not found");

  const seller = result.Item as Seller;
  if (seller.status === SELLER_STATUS.SUSPENDED) return notFound("Seller not found");

  return ok({
    seller: {
      sellerId: seller.sellerId,
      slug: seller.slug,
      businessName: seller.businessName,
      businessType: seller.businessType,
      city: seller.city,
      state: seller.state,
      status: seller.status,
      productCount: seller.productCount,
    },
  });
}
