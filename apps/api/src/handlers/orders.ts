import { PutCommand, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import {
  checkoutSchema,
  leadCaptureSchema,
  updateLeadSchema,
  orderStatusUpdateSchema,
  balanceProofSchema,
  orderKeys,
  customerKeys,
  ORDER_STATUS,
  ORDER_STATUS_TRANSITIONS,
  ORDER_TYPES,
  convertCartItemsToCurrency,
  cartSubtotal,
  calculateShippingQuote,
  canUseTokenPayment,
  computeTokenAmount,
  TOKEN_ORDER_DEFAULTS,
  productKeys,
  type Order,
  type OrderStatusHistoryEntry,
  type Product,
} from "@onlinesadar/shared";
import { resolveCheckoutUsdInrRate } from "../lib/exchange-rate";
import { docClient, ORDERS_TABLE, CUSTOMERS_TABLE, PRODUCTS_TABLE, now } from "../lib/db";
import { ok, created, badRequest, unauthorized, forbidden, notFound } from "../lib/response";
import { getAuth, getSessionId, getUserOrSessionKey, requireAdmin } from "../lib/auth";
import { getCartHandler, clearCartForUser } from "./cart";
import { notifyAdminLead, notifyAdminOrderPaid, notifyAdminOrderPlaced } from "../lib/email";
import { decrementInventoryForOrder, validateOrderInventory } from "../lib/inventory";
import { applyDeliveryReviewSchedule } from "./review-emails";
import { markCartConverted } from "./abandoned-cart-emails";
import {
  applyPercentDiscount,
  issueWelcomeCoupon,
  markCouponUsed,
  validateCouponRecord,
} from "./coupons";

type StoredOrder = Order & {
  PK: string;
  SK: string;
  GSI1PK: string;
  GSI1SK: string;
  GSI2PK: string;
  GSI2SK: string;
  GSI3PK: string;
  GSI3SK: string;
};

function buildOrderItem(order: Order, userKey: string): StoredOrder {
  return {
    ...order,
    PK: orderKeys.pk(order.orderId),
    SK: orderKeys.sk(),
    GSI1PK: orderKeys.gsi1pk(userKey),
    GSI1SK: orderKeys.gsi1sk(order.createdAt),
    GSI2PK: orderKeys.gsi2pk(),
    GSI2SK: orderKeys.gsi2sk(order.createdAt),
    GSI3PK: orderKeys.gsi3pk(order.status),
    GSI3SK: orderKeys.gsi3sk(order.createdAt),
  };
}

function normalizeEmail(email?: string): string | undefined {
  const trimmed = email?.trim();
  if (!trimmed || !trimmed.includes("@")) return undefined;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : undefined;
}

function pickContactField(incoming?: string, existing?: string): string | undefined {
  const next = incoming?.trim();
  if (next) return next;
  return existing;
}

export async function captureLead(event: APIGatewayProxyEventV2) {
  if ((event.body?.length ?? 0) > 16 * 1024) return badRequest("Payload too large");
  const body = JSON.parse(event.body ?? "{}");
  const parsed = leadCaptureSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const timestamp = now();
  const sessionId = parsed.data.sessionId;
  const email = normalizeEmail(parsed.data.email);

  let welcomeCoupon: { code: string; expiresAt: string; discountPercent: number } | undefined;
  let leadPayload = parsed.data;
  if (parsed.data.source === "newsletter" && email) {
    welcomeCoupon = await issueWelcomeCoupon({ email, sessionId });
    leadPayload = {
      ...parsed.data,
      metadata: {
        ...parsed.data.metadata,
        couponCode: welcomeCoupon.code,
        couponExpiresAt: welcomeCoupon.expiresAt,
        discountPercent: String(welcomeCoupon.discountPercent),
      },
    };
  }

  // lead event (co-located under the session)
  await docClient.send(
    new PutCommand({
      TableName: CUSTOMERS_TABLE,
      Item: {
        ...leadPayload,
        ...(email ? { email } : {}),
        leadId: uuidv4(),
        PK: customerKeys.pk(sessionId),
        SK: customerKeys.leadSk(timestamp),
        GSI1PK: customerKeys.gsi1pk(),
        GSI1SK: customerKeys.gsi1sk(timestamp),
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    })
  );

  const existing = await docClient.send(
    new GetCommand({
      TableName: CUSTOMERS_TABLE,
      Key: { PK: customerKeys.pk(sessionId), SK: customerKeys.profileSk() },
    })
  );
  const prev = existing.Item ?? {};

  // session identity rollup — merge so partial field updates don't wipe other fields
  await docClient.send(
    new PutCommand({
      TableName: CUSTOMERS_TABLE,
      Item: {
        sessionId,
        PK: customerKeys.pk(sessionId),
        SK: customerKeys.profileSk(),
        createdAt: (prev.createdAt as string) ?? timestamp,
        lastSeenAt: timestamp,
        updatedAt: timestamp,
        name: pickContactField(leadPayload.name, prev.name as string | undefined),
        email: email ?? (prev.email as string | undefined),
        phone: pickContactField(leadPayload.phone, prev.phone as string | undefined),
      },
    })
  );

  const emailResult = await notifyAdminLead(leadPayload);
  const emailRequired = leadPayload.source === "contact" || leadPayload.source === "newsletter";

  if (emailRequired && emailResult.skipped) {
    console.error("Email skipped — SMTP not configured:", leadPayload.source);
    return badRequest(
      "Email is not configured on the server yet. Please contact us on WhatsApp or at order@usarakhi.com."
    );
  }

  if (emailRequired && !emailResult.ok) {
    console.error("Lead email failed:", leadPayload.source, emailResult.error);
    return badRequest(
      emailResult.error ??
        "Your message was saved but email could not be sent. Please WhatsApp us or email order@usarakhi.com directly."
    );
  }

  return created({
    ok: true,
    emailSent: emailResult.ok,
    ...(welcomeCoupon ? { coupon: welcomeCoupon } : {}),
  });
}

export async function checkout(event: APIGatewayProxyEventV2) {
  const userKey = getUserOrSessionKey(event);
  if (!userKey) return unauthorized("Session or auth required");

  const body = JSON.parse(event.body ?? "{}");
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const cartResponse = await getCartHandler(event);
  const cartBody = JSON.parse(
    typeof cartResponse === "string" ? cartResponse : (cartResponse.body ?? "{}")
  );
  const cart = cartBody.cart;

  if (!cart?.items?.length) return badRequest("Cart is empty");

  const cartCurrency = cart.items[0]?.currency ?? "USD";
  const checkoutCurrency = parsed.data.checkoutCurrency ?? cartCurrency;

  if (parsed.data.paymentMethod === "stripe" && checkoutCurrency !== "USD") {
    return badRequest("Stripe checkout requires USD. Switch currency to USD or pay with Razorpay.");
  }

  const orderItems =
    checkoutCurrency !== cartCurrency
      ? convertCartItemsToCurrency(
          cart.items,
          checkoutCurrency,
          await resolveCheckoutUsdInrRate(parsed.data.usdInrRate)
        )
      : cart.items;

  const stockError = await validateOrderInventory(orderItems);
  if (stockError) return badRequest(stockError);

  const orderType = parsed.data.orderType ?? ORDER_TYPES.BULK;

  if (orderType === ORDER_TYPES.TOKEN && checkoutCurrency !== "INR") {
    return badRequest("Token booking is available in INR only");
  }

  if (orderType === ORDER_TYPES.SAMPLE) {
    const nonSample = orderItems.some((i: { isSample?: boolean }) => !i.isSample);
    if (nonSample) return badRequest("Sample checkout requires sample items only");
  }

  const subtotal = cartSubtotal(orderItems);

  const weightKg = parsed.data.weightKg ?? orderItems.length;
  const shippingQuote = calculateShippingQuote({
    postalCode: parsed.data.shippingAddress.postalCode,
    country: parsed.data.shippingAddress.country,
    weightKg,
    itemCount: orderItems.length,
  });
  const shipping =
    checkoutCurrency === "USD" ? shippingQuote.shippingUsd : shippingQuote.shippingInr;
  const tax = 0;

  let discount = 0;
  let couponCode: string | undefined;
  const checkoutEmail = normalizeEmail(parsed.data.shippingAddress.email);

  if (parsed.data.couponCode?.trim() && orderType === ORDER_TYPES.BULK) {
    if (!checkoutEmail) return badRequest("Email is required to apply a coupon");
    const coupon = await validateCouponRecord(parsed.data.couponCode, checkoutEmail);
    if (!coupon.valid) return badRequest(coupon.error ?? "Invalid coupon code");
    discount = applyPercentDiscount(subtotal, coupon.discountPercent!);
    couponCode = coupon.code;
  }

  let total = Math.max(0, subtotal - discount + shipping + tax);
  let tokenPercent: number | undefined;
  let tokenAmount: number | undefined;
  let balanceAmount: number | undefined;

  if (orderType === ORDER_TYPES.TOKEN) {
    if (!canUseTokenPayment(total)) {
      return badRequest(
        `Token booking requires minimum order value of ₹${TOKEN_ORDER_DEFAULTS.minOrderValueInr.toLocaleString("en-IN")}`
      );
    }
    tokenPercent = TOKEN_ORDER_DEFAULTS.tokenPercent;
    const split = computeTokenAmount(total, TOKEN_ORDER_DEFAULTS.tokenPercent);
    tokenAmount = split.tokenAmount;
    balanceAmount = split.balanceAmount;
    total = tokenAmount;
  }

  const currency = checkoutCurrency;

  // Resolve primary seller from first item
  let sellerId: string | undefined;
  const firstSlug = orderItems[0]?.productSlug;
  if (firstSlug) {
    const pResult = await docClient.send(
      new GetCommand({
        TableName: PRODUCTS_TABLE,
        Key: { PK: productKeys.pk(firstSlug), SK: productKeys.sk() },
      })
    );
    sellerId = (pResult.Item as Product | undefined)?.sellerId;
  }

  const orderId = uuidv4();
  const timestamp = now();
  const auth = getAuth(event);

  const initialStatus = ORDER_STATUS.PENDING_PAYMENT;
  const order: Order = {
    orderId,
    userId: auth?.userId,
    sessionId: getSessionId(event),
    items: orderItems,
    subtotal,
    discount,
    ...(couponCode ? { couponCode } : {}),
    shipping,
    tax,
    total,
    currency,
    orderType,
    ...(sellerId ? { sellerId } : {}),
    ...(tokenPercent ? { tokenPercent, tokenAmount, balanceAmount } : {}),
    status: initialStatus,
    statusHistory: [{ status: initialStatus, at: timestamp }],
    shippingAddress: parsed.data.shippingAddress,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const { createStripePaymentIntent } = await import("./payments/stripe");
  const { createRazorpayOrder } = await import("./payments/razorpay");

  if (parsed.data.paymentMethod === "stripe") {
    const payment = await createStripePaymentIntent(order);
    order.paymentProvider = "stripe";
    order.paymentIntentId = payment.paymentIntentId;
    await docClient.send(new PutCommand({ TableName: ORDERS_TABLE, Item: buildOrderItem(order, userKey) }));
    await clearCartForUser(userKey);
    const emailResult = await notifyAdminOrderPlaced(order);
    if (!emailResult.ok) console.error("Order placed email failed:", emailResult.error);
    return created({ order, clientSecret: payment.clientSecret });
  }

  const payment = await createRazorpayOrder(order);
  order.paymentProvider = "razorpay";
  order.razorpayOrderId = payment.razorpayOrderId;
  await docClient.send(new PutCommand({ TableName: ORDERS_TABLE, Item: buildOrderItem(order, userKey) }));
  await clearCartForUser(userKey);
  const emailResult = await notifyAdminOrderPlaced(order);
  if (!emailResult.ok) console.error("Order placed email failed:", emailResult.error);
  return created({ order, razorpayOrderId: payment.razorpayOrderId, razorpayKeyId: payment.keyId });
}

export async function listOrders(event: APIGatewayProxyEventV2) {
  const auth = getAuth(event);
  if (!auth) return unauthorized();

  const result = await docClient.send(
    new QueryCommand({
      TableName: ORDERS_TABLE,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: { ":pk": orderKeys.gsi1pk(auth.userId) },
      ScanIndexForward: false,
    })
  );

  return ok({ orders: result.Items ?? [] });
}

export async function listAdminOrders(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();

  const status = event.queryStringParameters?.status;

  if (status) {
    const result = await docClient.send(
      new QueryCommand({
        TableName: ORDERS_TABLE,
        IndexName: "GSI3",
        KeyConditionExpression: "GSI3PK = :pk",
        ExpressionAttributeValues: { ":pk": orderKeys.gsi3pk(status) },
        ScanIndexForward: false,
      })
    );
    return ok({ orders: result.Items ?? [] });
  }

  const result = await docClient.send(
    new QueryCommand({
      TableName: ORDERS_TABLE,
      IndexName: "GSI2",
      KeyConditionExpression: "GSI2PK = :pk",
      ExpressionAttributeValues: { ":pk": orderKeys.gsi2pk() },
      ScanIndexForward: false,
    })
  );

  return ok({ orders: result.Items ?? [] });
}

async function fetchOrder(orderId: string): Promise<StoredOrder | undefined> {
  const result = await docClient.send(
    new GetCommand({
      TableName: ORDERS_TABLE,
      Key: { PK: orderKeys.pk(orderId), SK: orderKeys.sk() },
    })
  );
  return result.Item as StoredOrder | undefined;
}

export async function getOrder(event: APIGatewayProxyEventV2) {
  const orderId = event.pathParameters?.orderId;
  if (!orderId) return badRequest("Order ID required");

  const order = await fetchOrder(orderId);
  if (!order) return notFound("Order not found");

  // ownership check: admin, matching user, or matching session
  const auth = getAuth(event);
  const sessionId = getSessionId(event);
  const isOwner =
    auth?.isAdmin ||
    (auth?.userId && order.userId === auth.userId) ||
    (sessionId && order.sessionId === sessionId);
  if (!isOwner) return forbidden();

  return ok({ order });
}

export async function getAdminOrder(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();

  const orderId = event.pathParameters?.orderId;
  if (!orderId) return badRequest("Order ID required");

  const order = await fetchOrder(orderId);
  if (!order) return notFound("Order not found");
  return ok({ order });
}

export async function updateOrderStatus(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();

  const orderId = event.pathParameters?.orderId;
  if (!orderId) return badRequest("Order ID required");

  const body = JSON.parse(event.body ?? "{}");
  const parsed = orderStatusUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const order = await fetchOrder(orderId);
  if (!order) return notFound("Order not found");

  const nextStatus = parsed.data.status ?? order.status;
  if (parsed.data.status && parsed.data.status !== order.status) {
    const allowed = ORDER_STATUS_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(parsed.data.status)) {
      return badRequest(`Cannot change status from ${order.status} to ${parsed.data.status}`);
    }
  }

  const timestamp = now();
  const historyEntry: OrderStatusHistoryEntry | null =
    parsed.data.status && parsed.data.status !== order.status
      ? {
          status: parsed.data.status,
          at: timestamp,
          ...(parsed.data.note ? { note: parsed.data.note } : {}),
        }
      : parsed.data.note
        ? { status: order.status, at: timestamp, note: parsed.data.note }
        : null;

  const updated: StoredOrder = {
    ...order,
    status: nextStatus,
    statusHistory: historyEntry
      ? [...(order.statusHistory ?? []), historyEntry]
      : order.statusHistory,
    ...(parsed.data.trackingNumber !== undefined && { trackingNumber: parsed.data.trackingNumber }),
    ...(parsed.data.carrier !== undefined && { carrier: parsed.data.carrier }),
    ...(parsed.data.adminNotes !== undefined && { adminNotes: parsed.data.adminNotes }),
    ...(parsed.data.estimatedDeliveryAt !== undefined && {
      estimatedDeliveryAt: parsed.data.estimatedDeliveryAt,
    }),
    ...applyDeliveryReviewSchedule(order, nextStatus, timestamp),
    updatedAt: timestamp,
    ...(parsed.data.status &&
      parsed.data.status !== order.status && {
        GSI3PK: orderKeys.gsi3pk(nextStatus),
        GSI3SK: orderKeys.gsi3sk(order.createdAt),
      }),
  };

  await docClient.send(new PutCommand({ TableName: ORDERS_TABLE, Item: updated }));
  return ok({ order: updated });
}

/** Mark an order paid (called by Stripe/Razorpay webhooks + Razorpay verify). */
export async function markOrderPaid(
  orderId: string | undefined,
  payment: { paymentIntentId?: string; razorpayPaymentId?: string }
) {
  if (!orderId) return;
  const order = await fetchOrder(orderId);
  if (!order) return;

  const isToken = order.orderType === ORDER_TYPES.TOKEN;
  const paidStatus = isToken ? ORDER_STATUS.TOKEN_PAID : ORDER_STATUS.PAID;
  if (order.status === paidStatus || order.status === ORDER_STATUS.PAID) return;

  const timestamp = now();
  const history: OrderStatusHistoryEntry[] = [
    ...(order.statusHistory ?? []),
    { status: paidStatus, at: timestamp },
  ];
  if (isToken) {
    history.push({ status: ORDER_STATUS.BALANCE_PENDING, at: timestamp, note: "Awaiting balance transfer to seller" });
  }

  const updated: StoredOrder = {
    ...order,
    status: isToken ? ORDER_STATUS.BALANCE_PENDING : ORDER_STATUS.PAID,
    statusHistory: history,
    ...(payment.paymentIntentId && { paymentIntentId: payment.paymentIntentId }),
    ...(payment.razorpayPaymentId && { razorpayPaymentId: payment.razorpayPaymentId }),
    updatedAt: timestamp,
    GSI3PK: orderKeys.gsi3pk(isToken ? ORDER_STATUS.BALANCE_PENDING : ORDER_STATUS.PAID),
    GSI3SK: orderKeys.gsi3sk(order.createdAt),
  };

  await docClient.send(new PutCommand({ TableName: ORDERS_TABLE, Item: updated }));
  if (order.couponCode) {
    await markCouponUsed(order.couponCode, order.orderId);
  }
  await markCartConverted(order.sessionId, order.orderId);
  if (!isToken) {
    await decrementInventoryForOrder(updated);
  }
  const emailResult = await notifyAdminOrderPaid(updated);
  if (!emailResult.ok) console.error("Order paid email failed:", emailResult.error);
}

/** Lookup an order by id (used by Razorpay verify for ownership/amount checks). */
export async function getOrderById(orderId: string): Promise<StoredOrder | undefined> {
  return fetchOrder(orderId);
}

function assertOrderAccess(event: APIGatewayProxyEventV2, order: StoredOrder): boolean {
  const auth = getAuth(event);
  const sessionId = getSessionId(event);
  return Boolean(
    auth?.isAdmin ||
      (auth?.userId && order.userId === auth.userId) ||
      (sessionId && order.sessionId === sessionId)
  );
}

/** Re-create payment for a pending order (retry after failed/cancelled checkout). */
export async function retryOrderPayment(event: APIGatewayProxyEventV2) {
  const orderId = event.pathParameters?.orderId;
  if (!orderId) return badRequest("Order ID required");

  const order = await fetchOrder(orderId);
  if (!order) return notFound("Order not found");
  if (!assertOrderAccess(event, order)) return forbidden();
  if (order.status !== ORDER_STATUS.PENDING_PAYMENT) {
    return badRequest("This order is not awaiting payment");
  }

  const body = JSON.parse(event.body ?? "{}");
  const paymentMethod = (body.paymentMethod as string | undefined) ?? order.paymentProvider ?? "stripe";

  if (paymentMethod === "stripe" && order.currency !== "USD") {
    return badRequest("Stripe retry requires USD orders");
  }

  const { createStripePaymentIntent } = await import("./payments/stripe");
  const { createRazorpayOrder } = await import("./payments/razorpay");
  const timestamp = now();

  if (paymentMethod === "stripe") {
    const payment = await createStripePaymentIntent(order);
    const updated: StoredOrder = {
      ...order,
      paymentProvider: "stripe",
      paymentIntentId: payment.paymentIntentId,
      updatedAt: timestamp,
    };
    await docClient.send(new PutCommand({ TableName: ORDERS_TABLE, Item: updated }));
    return ok({ order: updated, clientSecret: payment.clientSecret });
  }

  const payment = await createRazorpayOrder(order);
  const updated: StoredOrder = {
    ...order,
    paymentProvider: "razorpay",
    razorpayOrderId: payment.razorpayOrderId,
    updatedAt: timestamp,
  };
  await docClient.send(new PutCommand({ TableName: ORDERS_TABLE, Item: updated }));
  return ok({
    order: updated,
    razorpayOrderId: payment.razorpayOrderId,
    razorpayKeyId: payment.keyId,
  });
}

export async function listLeads(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();

  const result = await docClient.send(
    new QueryCommand({
      TableName: CUSTOMERS_TABLE,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: { ":pk": customerKeys.gsi1pk() },
      ScanIndexForward: false,
      Limit: 200,
    })
  );

  return ok({ leads: result.Items ?? [] });
}

export async function updateLead(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();

  const body = JSON.parse(event.body ?? "{}");
  const parsed = updateLeadSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const { sessionId, createdAt, ...fields } = parsed.data;
  const existing = await docClient.send(
    new GetCommand({
      TableName: CUSTOMERS_TABLE,
      Key: {
        PK: customerKeys.pk(sessionId),
        SK: customerKeys.leadSk(createdAt),
      },
    })
  );
  if (!existing.Item) return notFound("Lead not found");

  const timestamp = now();
  const updated = {
    ...existing.Item,
    ...fields,
    updatedAt: timestamp,
  };

  await docClient.send(new PutCommand({ TableName: CUSTOMERS_TABLE, Item: updated }));
  return ok({ lead: updated });
}

/** Buyer uploads UTR proof for token order balance. */
export async function submitBalanceProof(event: APIGatewayProxyEventV2) {
  const orderId = event.pathParameters?.orderId;
  if (!orderId) return badRequest("Order ID required");

  const order = await fetchOrder(orderId);
  if (!order) return notFound("Order not found");
  if (!assertOrderAccess(event, order)) return forbidden();
  if (order.orderType !== ORDER_TYPES.TOKEN) return badRequest("Not a token order");
  if (order.status !== ORDER_STATUS.BALANCE_PENDING && order.status !== ORDER_STATUS.TOKEN_PAID) {
    return badRequest("Order is not awaiting balance payment");
  }

  const body = JSON.parse(event.body ?? "{}");
  const parsed = balanceProofSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const timestamp = now();
  const updated: StoredOrder = {
    ...order,
    balanceProof: {
      utrNumber: parsed.data.utrNumber,
      amount: parsed.data.amount,
      proofImageUrl: parsed.data.proofImageUrl,
      note: parsed.data.note,
      submittedAt: timestamp,
    },
    statusHistory: [
      ...(order.statusHistory ?? []),
      { status: order.status, at: timestamp, note: `Balance proof submitted: UTR ${parsed.data.utrNumber}` },
    ],
    updatedAt: timestamp,
  };

  await docClient.send(new PutCommand({ TableName: ORDERS_TABLE, Item: updated }));
  return ok({ order: updated });
}

/** Seller or admin confirms balance received — order can proceed. */
export async function confirmBalanceReceived(event: APIGatewayProxyEventV2) {
  const orderId = event.pathParameters?.orderId;
  if (!orderId) return badRequest("Order ID required");

  const order = await fetchOrder(orderId);
  if (!order) return notFound("Order not found");
  if (order.orderType !== ORDER_TYPES.TOKEN) return badRequest("Not a token order");

  const auth = getAuth(event);
  if (!auth?.isAdmin && !auth?.isSeller) return forbidden();

  const timestamp = now();
  const updated: StoredOrder = {
    ...order,
    status: ORDER_STATUS.BALANCE_RECEIVED,
    balanceConfirmedAt: timestamp,
    statusHistory: [
      ...(order.statusHistory ?? []),
      { status: ORDER_STATUS.BALANCE_RECEIVED, at: timestamp, note: "Balance payment confirmed" },
    ],
    updatedAt: timestamp,
    GSI3PK: orderKeys.gsi3pk(ORDER_STATUS.BALANCE_RECEIVED),
    GSI3SK: orderKeys.gsi3sk(order.createdAt),
  };

  await docClient.send(new PutCommand({ TableName: ORDERS_TABLE, Item: updated }));
  await decrementInventoryForOrder(updated);
  return ok({ order: updated });
}

/** Seller inbox: orders for their products. */
export async function listSellerOrders(event: APIGatewayProxyEventV2) {
  const auth = getAuth(event);
  if (!auth) return unauthorized();

  const { SELLERS_TABLE } = await import("../lib/db");
  const { sellerKeys } = await import("@onlinesadar/shared");
  const sellerResult = await docClient.send(
    new QueryCommand({
      TableName: SELLERS_TABLE,
      IndexName: "GSI2",
      KeyConditionExpression: "GSI2PK = :pk AND GSI2SK = :sk",
      ExpressionAttributeValues: {
        ":pk": sellerKeys.gsi2pk(auth.userId),
        ":sk": sellerKeys.gsi2sk(),
      },
      Limit: 1,
    })
  );
  const seller = sellerResult.Items?.[0] as { sellerId: string } | undefined;
  if (!seller && !auth.isAdmin) return forbidden();

  const sellerId = seller?.sellerId ?? event.queryStringParameters?.sellerId;
  if (!sellerId) return notFound("Seller not found");

  const result = await docClient.send(
    new QueryCommand({
      TableName: ORDERS_TABLE,
      IndexName: "GSI2",
      KeyConditionExpression: "GSI2PK = :pk",
      ExpressionAttributeValues: { ":pk": orderKeys.gsi2pk() },
      ScanIndexForward: false,
      Limit: 500,
    })
  );

  const orders = (result.Items ?? []).filter((o) => o.sellerId === sellerId);
  return ok({ orders });
}
