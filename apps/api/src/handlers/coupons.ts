import { GetCommand, PutCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { randomBytes } from "crypto";
import {
  couponValidateSchema,
  couponKeys,
  WELCOME_COUPON_HOURS,
  WELCOME_DISCOUNT_PERCENT,
  ABANDONED_CART_COUPON_HOURS,
  ABANDONED_CART_DISCOUNT_PERCENT,
  type CouponValidationResult,
  type WelcomeCoupon,
  type StoreCoupon,
} from "@onlinesadar/shared";
import { docClient, CONFIG_TABLE, now } from "../lib/db";
import { ok, badRequest, forbidden } from "../lib/response";
import { requireAdmin } from "../lib/auth";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  let suffix = "";
  for (let i = 0; i < 6; i++) suffix += chars[bytes[i]! % chars.length];
  return `RAKHI-${suffix}`;
}

function welcomeExpiresAt(from = new Date()): string {
  return new Date(from.getTime() + WELCOME_COUPON_HOURS * 60 * 60 * 1000).toISOString();
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function validateCouponRecord(
  code: string,
  email: string
): Promise<CouponValidationResult> {
  const normalizedCode = code.trim().toUpperCase();
  const normalizedEmail = normalizeEmail(email);

  const result = await docClient.send(
    new GetCommand({
      TableName: CONFIG_TABLE,
      Key: { PK: couponKeys.pk(normalizedCode), SK: couponKeys.sk() },
    })
  );

  const coupon = result.Item as StoreCoupon | undefined;
  if (!coupon) {
    return { valid: false, error: "Invalid coupon code" };
  }

  if (coupon.usedAt) {
    return { valid: false, error: "This coupon has already been used" };
  }

  if (new Date(coupon.expiresAt).getTime() < Date.now()) {
    return { valid: false, error: "This coupon has expired" };
  }

  if (normalizeEmail(coupon.email) !== normalizedEmail) {
    return { valid: false, error: "This coupon is registered to a different email address" };
  }

  return {
    valid: true,
    code: coupon.code,
    discountPercent: coupon.discountPercent,
    expiresAt: coupon.expiresAt,
  };
}

export async function issueWelcomeCoupon(input: {
  email: string;
  sessionId?: string;
}): Promise<{ code: string; expiresAt: string; discountPercent: number }> {
  const email = normalizeEmail(input.email);
  const timestamp = now();
  const expiresAt = welcomeExpiresAt();

  const existing = await docClient.send(
    new GetCommand({
      TableName: CONFIG_TABLE,
      Key: { PK: couponKeys.welcomeEmailPk(email), SK: couponKeys.welcomeEmailSk() },
    })
  );

  const activeCode = existing.Item?.code as string | undefined;
  if (activeCode) {
    const active = await validateCouponRecord(activeCode, email);
    if (active.valid) {
      return {
        code: active.code!,
        expiresAt: active.expiresAt!,
        discountPercent: active.discountPercent!,
      };
    }
  }

  const code = generateCode();
  const coupon: WelcomeCoupon & { PK: string; SK: string } = {
    PK: couponKeys.pk(code),
    SK: couponKeys.sk(),
    code,
    email,
    discountPercent: WELCOME_DISCOUNT_PERCENT,
    expiresAt,
    createdAt: timestamp,
    sessionId: input.sessionId,
    source: "welcome",
  };

  await docClient.send(
    new PutCommand({
      TableName: CONFIG_TABLE,
      Item: coupon,
    })
  );

  await docClient.send(
    new PutCommand({
      TableName: CONFIG_TABLE,
      Item: {
        PK: couponKeys.welcomeEmailPk(email),
        SK: couponKeys.welcomeEmailSk(),
        code,
        expiresAt,
        createdAt: timestamp,
        email,
      },
    })
  );

  return { code, expiresAt, discountPercent: WELCOME_DISCOUNT_PERCENT };
}

export async function issueAbandonedCartCoupon(input: {
  email: string;
  sessionId?: string;
}): Promise<{ code: string; expiresAt: string; discountPercent: number }> {
  const email = normalizeEmail(input.email);
  const timestamp = now();
  const expiresAt = new Date(
    Date.now() + ABANDONED_CART_COUPON_HOURS * 60 * 60 * 1000
  ).toISOString();

  const existing = await docClient.send(
    new GetCommand({
      TableName: CONFIG_TABLE,
      Key: { PK: couponKeys.abandonedEmailPk(email), SK: couponKeys.abandonedEmailSk() },
    })
  );

  const activeCode = existing.Item?.code as string | undefined;
  if (activeCode) {
    const active = await validateCouponRecord(activeCode, email);
    if (active.valid) {
      return {
        code: active.code!,
        expiresAt: active.expiresAt!,
        discountPercent: active.discountPercent!,
      };
    }
  }

  const code = generateCode();
  const coupon: StoreCoupon & { PK: string; SK: string } = {
    PK: couponKeys.pk(code),
    SK: couponKeys.sk(),
    code,
    email,
    discountPercent: ABANDONED_CART_DISCOUNT_PERCENT,
    expiresAt,
    createdAt: timestamp,
    sessionId: input.sessionId,
    source: "abandoned",
  };

  await docClient.send(new PutCommand({ TableName: CONFIG_TABLE, Item: coupon }));
  await docClient.send(
    new PutCommand({
      TableName: CONFIG_TABLE,
      Item: {
        PK: couponKeys.abandonedEmailPk(email),
        SK: couponKeys.abandonedEmailSk(),
        code,
        expiresAt,
        createdAt: timestamp,
        email,
      },
    })
  );

  return { code, expiresAt, discountPercent: ABANDONED_CART_DISCOUNT_PERCENT };
}

export async function markCouponUsed(code: string, orderId: string): Promise<void> {
  const normalizedCode = code.trim().toUpperCase();
  const timestamp = now();

  await docClient.send(
    new UpdateCommand({
      TableName: CONFIG_TABLE,
      Key: { PK: couponKeys.pk(normalizedCode), SK: couponKeys.sk() },
      UpdateExpression: "SET usedAt = :usedAt, orderId = :orderId",
      ConditionExpression: "attribute_exists(PK) AND attribute_not_exists(usedAt)",
      ExpressionAttributeValues: {
        ":usedAt": timestamp,
        ":orderId": orderId,
      },
    })
  ).catch(() => {
    /* already used or missing — non-blocking */
  });
}

export function applyPercentDiscount(subtotal: number, percent: number): number {
  return Math.round(subtotal * (percent / 100) * 100) / 100;
}

export async function validateCouponHandler(event: APIGatewayProxyEventV2) {
  const body = JSON.parse(event.body ?? "{}");
  const parsed = couponValidateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const result = await validateCouponRecord(parsed.data.code, parsed.data.email);
  if (!result.valid) return badRequest(result.error ?? "Invalid coupon");

  return ok(result);
}

export async function listWelcomeCoupons(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();

  const result = await docClient.send(
    new ScanCommand({
      TableName: CONFIG_TABLE,
      FilterExpression: "begins_with(PK, :prefix) AND SK = :sk AND #src = :src",
      ExpressionAttributeNames: { "#src": "source" },
      ExpressionAttributeValues: {
        ":prefix": "COUPON#",
        ":sk": "META",
        ":src": "welcome",
      },
    })
  );

  const coupons = ((result.Items ?? []) as WelcomeCoupon[]).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return ok({ coupons });
}
