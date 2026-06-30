"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCartHandler = getCartHandler;
exports.addToCart = addToCart;
exports.removeFromCart = removeFromCart;
exports.updateCartItem = updateCartItem;
exports.clearCartForUser = clearCartForUser;
exports.clearCart = clearCart;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const shared_1 = require("@onlinesadar/shared");
const db_1 = require("../lib/db");
const response_1 = require("../lib/response");
const auth_1 = require("../lib/auth");
const images_1 = require("../lib/images");
const CART_TTL_DAYS = 30;
async function getCart(userKey) {
    const result = await db_1.docClient.send(new lib_dynamodb_1.GetCommand({
        TableName: db_1.CARTS_TABLE,
        Key: { PK: shared_1.cartKeys.pk(userKey), SK: shared_1.cartKeys.sk() },
    }));
    return result.Item ?? { items: [], updatedAt: (0, db_1.now)() };
}
async function saveCart(userKey, cart, sessionId) {
    const timestamp = (0, db_1.now)();
    const existing = await db_1.docClient.send(new lib_dynamodb_1.GetCommand({
        TableName: db_1.CARTS_TABLE,
        Key: { PK: shared_1.cartKeys.pk(userKey), SK: shared_1.cartKeys.sk() },
    }));
    const createdAt = existing.Item?.createdAt ?? timestamp;
    const itemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);
    const value = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    await db_1.docClient.send(new lib_dynamodb_1.PutCommand({
        TableName: db_1.CARTS_TABLE,
        Item: {
            PK: shared_1.cartKeys.pk(userKey),
            SK: shared_1.cartKeys.sk(),
            ...cart,
            userKey,
            sessionId,
            createdAt,
            itemCount,
            value,
            currency: cart.items[0]?.currency,
            updatedAt: timestamp,
            GSI1PK: shared_1.cartKeys.gsi1pk(),
            GSI1SK: shared_1.cartKeys.gsi1sk(timestamp),
            expiresAt: (0, db_1.ttlInDays)(CART_TTL_DAYS),
        },
    }));
}
async function loadProduct(slug) {
    const result = await db_1.docClient.send(new lib_dynamodb_1.GetCommand({
        TableName: db_1.PRODUCTS_TABLE,
        Key: { PK: shared_1.productKeys.pk(slug), SK: shared_1.productKeys.sk() },
    }));
    return result.Item ?? null;
}
function buildCartItem(product, quantity, isSample) {
    const validation = (0, shared_1.validateMoqQuantity)(product, quantity, {
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
        image: (0, images_1.resolveProductImageUrl)(product.images?.[0]),
        sellerId: product.sellerId,
        moq: product.moq,
        isSample,
    };
}
async function getCartHandler(event) {
    const userKey = (0, auth_1.getUserOrSessionKey)(event);
    if (!userKey)
        return (0, response_1.unauthorized)("Session or auth required");
    const raw = await getCart(userKey);
    const items = (raw.items ?? []).map((item) => ({
        ...item,
        image: item.image ? (0, images_1.resolveProductImageUrl)(item.image) : item.image,
    }));
    return (0, response_1.ok)({ cart: { items, updatedAt: raw.updatedAt ?? (0, db_1.now)() } });
}
async function addToCart(event) {
    const userKey = (0, auth_1.getUserOrSessionKey)(event);
    if (!userKey)
        return (0, response_1.unauthorized)("Session or auth required");
    const body = JSON.parse(event.body ?? "{}");
    const parsed = shared_1.addToCartSchema.safeParse(body);
    if (!parsed.success)
        return (0, response_1.badRequest)(parsed.error.message);
    const product = await loadProduct(parsed.data.productSlug);
    if (!product)
        return (0, response_1.badRequest)("Product not found");
    const isSample = parsed.data.isSample ?? false;
    if (isSample && !product.sampleAvailable)
        return (0, response_1.badRequest)("Sample not available for this product");
    let qty = parsed.data.quantity;
    if (!isSample && qty === 1 && (product.moq ?? 1) > 1) {
        qty = (0, shared_1.defaultCartQuantity)(product);
    }
    const cart = await getCart(userKey);
    const existingIdx = cart.items.findIndex((i) => i.productSlug === parsed.data.productSlug && Boolean(i.isSample) === isSample);
    const newQty = existingIdx >= 0 ? cart.items[existingIdx].quantity + qty : qty;
    const validation = (0, shared_1.validateMoqQuantity)(product, newQty, {
        isSample,
        sampleMaxQty: product.sampleMaxQty,
    });
    if (!validation.valid)
        return (0, response_1.badRequest)(validation.error);
    if (newQty > product.inventory)
        return (0, response_1.badRequest)("Insufficient inventory");
    const item = buildCartItem(product, newQty, isSample);
    if (existingIdx >= 0) {
        cart.items[existingIdx] = item;
    }
    else {
        cart.items.push(item);
    }
    await saveCart(userKey, cart, (0, auth_1.getSessionId)(event));
    return (0, response_1.ok)({ cart });
}
async function removeFromCart(event) {
    const userKey = (0, auth_1.getUserOrSessionKey)(event);
    if (!userKey)
        return (0, response_1.unauthorized)("Session or auth required");
    const productSlug = event.pathParameters?.productSlug;
    if (!productSlug)
        return (0, response_1.badRequest)("Product slug required");
    const cart = await getCart(userKey);
    cart.items = cart.items.filter((i) => i.productSlug !== productSlug);
    await saveCart(userKey, cart, (0, auth_1.getSessionId)(event));
    return (0, response_1.ok)({ cart });
}
async function updateCartItem(event) {
    const userKey = (0, auth_1.getUserOrSessionKey)(event);
    if (!userKey)
        return (0, response_1.unauthorized)("Session or auth required");
    const productSlug = event.pathParameters?.productSlug;
    if (!productSlug)
        return (0, response_1.badRequest)("Product slug required");
    const body = JSON.parse(event.body ?? "{}");
    const quantity = Number(body.quantity);
    if (!quantity || quantity < 1)
        return (0, response_1.badRequest)("Valid quantity required");
    const product = await loadProduct(productSlug);
    if (!product)
        return (0, response_1.badRequest)("Product not found");
    const cart = await getCart(userKey);
    const item = cart.items.find((i) => i.productSlug === productSlug);
    if (!item)
        return (0, response_1.badRequest)("Item not in cart");
    const validation = (0, shared_1.validateMoqQuantity)(product, quantity, {
        isSample: item.isSample,
        sampleMaxQty: product.sampleMaxQty,
    });
    if (!validation.valid)
        return (0, response_1.badRequest)(validation.error);
    if (quantity > product.inventory)
        return (0, response_1.badRequest)("Insufficient inventory");
    Object.assign(item, buildCartItem(product, quantity, Boolean(item.isSample)));
    await saveCart(userKey, cart, (0, auth_1.getSessionId)(event));
    return (0, response_1.ok)({ cart });
}
async function clearCartForUser(userKey) {
    await saveCart(userKey, { items: [], updatedAt: (0, db_1.now)() });
}
async function clearCart(event) {
    const userKey = (0, auth_1.getUserOrSessionKey)(event);
    if (!userKey)
        return (0, response_1.unauthorized)("Session or auth required");
    await clearCartForUser(userKey);
    return (0, response_1.ok)({ cart: { items: [] } });
}
