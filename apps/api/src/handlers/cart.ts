import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import {
  addToCartSchema,
  cartKeys,
  productKeys,
  validateMoqQuantity,
  defaultCartQuantity,
  type Cart,
  type CartItem,
  type Product,
} from "@onlinesadar/shared";
import { docClient, CARTS_TABLE, PRODUCTS_TABLE, now, ttlInDays } from "../lib/db";
import { ok, badRequest, unauthorized } from "../lib/response";
import { getUserOrSessionKey, getSessionId } from "../lib/auth";
import { resolveProductImageUrl } from "../lib/images";

const CART_TTL_DAYS = 30;

async function getCart(userKey: string): Promise<Cart & { createdAt?: string }> {
  const result = await docClient.send(
    new GetCommand({
      TableName: CARTS_TABLE,
      Key: { PK: cartKeys.pk(userKey), SK: cartKeys.sk() },
    })
  );
  return (result.Item as Cart & { createdAt?: string }) ?? { items: [], updatedAt: now() };
}

async function saveCart(userKey: string, cart: Cart, sessionId?: string) {
  const timestamp = now();
  const existing = await docClient.send(
    new GetCommand({
      TableName: CARTS_TABLE,
      Key: { PK: cartKeys.pk(userKey), SK: cartKeys.sk() },
    })
  );
  const createdAt = (existing.Item?.createdAt as string | undefined) ?? timestamp;
  const itemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);
  const value = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  await docClient.send(
    new PutCommand({
      TableName: CARTS_TABLE,
      Item: {
        PK: cartKeys.pk(userKey),
        SK: cartKeys.sk(),
        ...cart,
        userKey,
        sessionId,
        createdAt,
        itemCount,
        value,
        currency: cart.items[0]?.currency,
        updatedAt: timestamp,
        GSI1PK: cartKeys.gsi1pk(),
        GSI1SK: cartKeys.gsi1sk(timestamp),
        expiresAt: ttlInDays(CART_TTL_DAYS),
      },
    })
  );
}

async function loadProduct(slug: string): Promise<Product | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: PRODUCTS_TABLE,
      Key: { PK: productKeys.pk(slug), SK: productKeys.sk() },
    })
  );
  return (result.Item as Product) ?? null;
}

function buildCartItem(product: Product, quantity: number, isSample: boolean): CartItem {
  const validation = validateMoqQuantity(product, quantity, {
    isSample,
    sampleMaxQty: product.sampleMaxQty,
  });
  const unitPrice = isSample && product.samplePrice ? product.samplePrice : validation.valid ? validation.unitPrice : product.price;

  return {
    productSlug: product.slug,
    name: isSample ? `${product.name} (Sample)` : product.name,
    price: unitPrice,
    currency: product.currency ?? "INR",
    quantity: validation.valid ? validation.normalizedQty : quantity,
    image: resolveProductImageUrl(product.images?.[0]),
    sellerId: product.sellerId,
    moq: product.moq,
    isSample,
  };
}

export async function getCartHandler(event: APIGatewayProxyEventV2) {
  const userKey = getUserOrSessionKey(event);
  if (!userKey) return unauthorized("Session or auth required");

  const raw = await getCart(userKey);
  const items = (raw.items ?? []).map((item) => ({
    ...item,
    image: item.image ? resolveProductImageUrl(item.image) : item.image,
  }));
  return ok({ cart: { items, updatedAt: raw.updatedAt ?? now() } });
}

export async function addToCart(event: APIGatewayProxyEventV2) {
  const userKey = getUserOrSessionKey(event);
  if (!userKey) return unauthorized("Session or auth required");

  const body = JSON.parse(event.body ?? "{}");
  const parsed = addToCartSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const product = await loadProduct(parsed.data.productSlug);
  if (!product) return badRequest("Product not found");

  const isSample = parsed.data.isSample ?? false;
  if (isSample && !product.sampleAvailable) return badRequest("Sample not available for this product");

  let qty = parsed.data.quantity;
  if (!isSample && qty === 1 && (product.moq ?? 1) > 1) {
    qty = defaultCartQuantity(product);
  }

  const cart = await getCart(userKey);
  const existingIdx = cart.items.findIndex(
    (i) => i.productSlug === parsed.data.productSlug && Boolean(i.isSample) === isSample
  );

  const newQty = existingIdx >= 0 ? cart.items[existingIdx].quantity + qty : qty;
  const validation = validateMoqQuantity(product, newQty, {
    isSample,
    sampleMaxQty: product.sampleMaxQty,
  });
  if (!validation.valid) return badRequest(validation.error);

  if (newQty > product.inventory) return badRequest("Insufficient inventory");

  const item = buildCartItem(product, newQty, isSample);

  if (existingIdx >= 0) {
    cart.items[existingIdx] = item;
  } else {
    cart.items.push(item);
  }

  await saveCart(userKey, cart, getSessionId(event));
  return ok({ cart });
}

export async function removeFromCart(event: APIGatewayProxyEventV2) {
  const userKey = getUserOrSessionKey(event);
  if (!userKey) return unauthorized("Session or auth required");

  const productSlug = event.pathParameters?.productSlug;
  if (!productSlug) return badRequest("Product slug required");

  const cart = await getCart(userKey);
  cart.items = cart.items.filter((i) => i.productSlug !== productSlug);
  await saveCart(userKey, cart, getSessionId(event));
  return ok({ cart });
}

export async function updateCartItem(event: APIGatewayProxyEventV2) {
  const userKey = getUserOrSessionKey(event);
  if (!userKey) return unauthorized("Session or auth required");

  const productSlug = event.pathParameters?.productSlug;
  if (!productSlug) return badRequest("Product slug required");

  const body = JSON.parse(event.body ?? "{}");
  const quantity = Number(body.quantity);
  if (!quantity || quantity < 1) return badRequest("Valid quantity required");

  const product = await loadProduct(productSlug);
  if (!product) return badRequest("Product not found");

  const cart = await getCart(userKey);
  const item = cart.items.find((i) => i.productSlug === productSlug);
  if (!item) return badRequest("Item not in cart");

  const validation = validateMoqQuantity(product, quantity, {
    isSample: item.isSample,
    sampleMaxQty: product.sampleMaxQty,
  });
  if (!validation.valid) return badRequest(validation.error);
  if (quantity > product.inventory) return badRequest("Insufficient inventory");

  Object.assign(item, buildCartItem(product, quantity, Boolean(item.isSample)));
  await saveCart(userKey, cart, getSessionId(event));
  return ok({ cart });
}

export async function clearCartForUser(userKey: string) {
  await saveCart(userKey, { items: [], updatedAt: now() });
}

export async function clearCart(event: APIGatewayProxyEventV2) {
  const userKey = getUserOrSessionKey(event);
  if (!userKey) return unauthorized("Session or auth required");

  await clearCartForUser(userKey);
  return ok({ cart: { items: [] } });
}
