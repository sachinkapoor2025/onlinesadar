"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.listProducts = listProducts;
exports.getProduct = getProduct;
exports.createProduct = createProduct;
exports.updateProduct = updateProduct;
exports.listAdminProducts = listAdminProducts;
exports.deleteProduct = deleteProduct;
exports.bulkUploadProducts = bulkUploadProducts;
exports.listSellerProducts = listSellerProducts;
exports.createSellerProduct = createSellerProduct;
exports.updateSellerProduct = updateSellerProduct;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const shared_1 = require("@onlinesadar/shared");
const db_1 = require("../lib/db");
const response_1 = require("../lib/response");
const auth_1 = require("../lib/auth");
const images_1 = require("../lib/images");
const inventory_1 = require("../lib/inventory");
async function getSellerForUser(userId) {
    const result = await db_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: db_1.SELLERS_TABLE,
        IndexName: "GSI2",
        KeyConditionExpression: "GSI2PK = :pk AND GSI2SK = :sk",
        ExpressionAttributeValues: {
            ":pk": shared_1.sellerKeys.gsi2pk(userId),
            ":sk": shared_1.sellerKeys.gsi2sk(),
        },
        Limit: 1,
    }));
    return result.Items?.[0] ?? null;
}
function canSellerList(seller) {
    return seller.status === shared_1.SELLER_STATUS.TRIAL_ACTIVE || seller.status === shared_1.SELLER_STATUS.VERIFIED;
}
async function listProducts(event) {
    const category = event.queryStringParameters?.category;
    const search = event.queryStringParameters?.search?.toLowerCase();
    const sellerSlug = event.queryStringParameters?.seller;
    let items = [];
    let sellerIdFilter;
    if (sellerSlug) {
        const { SELLERS_TABLE } = await Promise.resolve().then(() => __importStar(require("../lib/db")));
        const { sellerKeys } = await Promise.resolve().then(() => __importStar(require("@onlinesadar/shared")));
        const slugRef = await db_1.docClient.send(new lib_dynamodb_1.GetCommand({
            TableName: SELLERS_TABLE,
            Key: { PK: sellerKeys.slugPk(sellerSlug), SK: sellerKeys.slugSk() },
        }));
        sellerIdFilter = slugRef.Item?.sellerId;
        if (!sellerIdFilter)
            return (0, response_1.ok)({ products: [] });
    }
    if (category) {
        const result = await db_1.docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: db_1.PRODUCTS_TABLE,
            IndexName: "GSI1",
            KeyConditionExpression: "GSI1PK = :pk",
            ExpressionAttributeValues: { ":pk": shared_1.productKeys.gsi1pk(category) },
        }));
        items = (result.Items ?? []);
    }
    else {
        const result = await db_1.docClient.send(new lib_dynamodb_1.ScanCommand({
            TableName: db_1.PRODUCTS_TABLE,
            FilterExpression: "begins_with(PK, :prefix) AND SK = :sk",
            ExpressionAttributeValues: { ":prefix": "PRODUCT#", ":sk": "META" },
        }));
        items = (result.Items ?? []);
    }
    items = items.filter((p) => p.published !== false && (p.inventory ?? 0) > 0);
    if (sellerIdFilter) {
        items = items.filter((p) => p.sellerId === sellerIdFilter);
    }
    if (search) {
        items = items.filter((p) => p.name.toLowerCase().includes(search) ||
            p.description.toLowerCase().includes(search) ||
            p.tags?.some((t) => t.toLowerCase().includes(search)));
    }
    return (0, response_1.ok)({ products: items.map(images_1.withResolvedProductImages) });
}
async function getProduct(event) {
    const slug = event.pathParameters?.slug;
    if (!slug)
        return (0, response_1.badRequest)("Slug required");
    const result = await db_1.docClient.send(new lib_dynamodb_1.GetCommand({
        TableName: db_1.PRODUCTS_TABLE,
        Key: { PK: shared_1.productKeys.pk(slug), SK: shared_1.productKeys.sk() },
    }));
    if (!result.Item)
        return (0, response_1.notFound)("Product not found");
    const product = result.Item;
    if (product.published === false)
        return (0, response_1.notFound)("Product not found");
    return (0, response_1.ok)({ product: (0, images_1.withResolvedProductImages)(result.Item) });
}
async function createProduct(event) {
    const auth = (0, auth_1.getAuth)(event);
    if (!auth?.isAdmin)
        return (0, response_1.forbidden)();
    const body = JSON.parse(event.body ?? "{}");
    const parsed = shared_1.createProductSchema.safeParse(body);
    if (!parsed.success)
        return (0, response_1.badRequest)(parsed.error.message);
    const slug = (0, db_1.slugify)(parsed.data.name);
    const timestamp = (0, db_1.now)();
    const inventory = parsed.data.inventory ?? shared_1.DEFAULT_PRODUCT_INVENTORY;
    const item = {
        ...parsed.data,
        inventory,
        slug,
        PK: shared_1.productKeys.pk(slug),
        SK: shared_1.productKeys.sk(),
        GSI1PK: shared_1.productKeys.gsi1pk(parsed.data.categorySlug),
        GSI1SK: shared_1.productKeys.gsi1sk(slug),
        createdAt: timestamp,
        updatedAt: timestamp,
    };
    await db_1.docClient.send(new lib_dynamodb_1.PutCommand({ TableName: db_1.PRODUCTS_TABLE, Item: item }));
    return (0, response_1.created)({ product: item });
}
async function updateProduct(event) {
    const auth = (0, auth_1.getAuth)(event);
    if (!auth?.isAdmin)
        return (0, response_1.forbidden)();
    const slug = event.pathParameters?.slug;
    if (!slug)
        return (0, response_1.badRequest)("Slug required");
    const existing = await db_1.docClient.send(new lib_dynamodb_1.GetCommand({
        TableName: db_1.PRODUCTS_TABLE,
        Key: { PK: shared_1.productKeys.pk(slug), SK: shared_1.productKeys.sk() },
    }));
    if (!existing.Item)
        return (0, response_1.notFound)("Product not found");
    const previous = existing.Item;
    const body = JSON.parse(event.body ?? "{}");
    const parsed = shared_1.updateProductSchema.safeParse(body);
    if (!parsed.success)
        return (0, response_1.badRequest)(parsed.error.message);
    const updated = {
        ...previous,
        ...parsed.data,
        updatedAt: (0, db_1.now)(),
    };
    if (parsed.data.categorySlug) {
        updated.GSI1PK = shared_1.productKeys.gsi1pk(parsed.data.categorySlug);
        updated.GSI1SK = shared_1.productKeys.gsi1sk(slug);
    }
    await db_1.docClient.send(new lib_dynamodb_1.PutCommand({ TableName: db_1.PRODUCTS_TABLE, Item: updated }));
    if (parsed.data.inventory !== undefined) {
        await (0, inventory_1.syncInventoryAlertState)(slug, previous, parsed.data.inventory);
    }
    return (0, response_1.ok)({ product: updated });
}
/** Admin: list all products including unpublished. */
async function listAdminProducts(event) {
    const auth = (0, auth_1.getAuth)(event);
    if (!auth?.isAdmin)
        return (0, response_1.forbidden)();
    const result = await db_1.docClient.send(new lib_dynamodb_1.ScanCommand({
        TableName: db_1.PRODUCTS_TABLE,
        FilterExpression: "begins_with(PK, :prefix) AND SK = :sk",
        ExpressionAttributeValues: { ":prefix": "PRODUCT#", ":sk": "META" },
    }));
    const items = (result.Items ?? []).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return (0, response_1.ok)({ products: items.map(images_1.withResolvedProductImages) });
}
async function deleteProduct(event) {
    const auth = (0, auth_1.getAuth)(event);
    if (!auth?.isAdmin)
        return (0, response_1.forbidden)();
    const slug = event.pathParameters?.slug;
    if (!slug)
        return (0, response_1.badRequest)("Slug required");
    await db_1.docClient.send(new lib_dynamodb_1.DeleteCommand({
        TableName: db_1.PRODUCTS_TABLE,
        Key: { PK: shared_1.productKeys.pk(slug), SK: shared_1.productKeys.sk() },
    }));
    return (0, response_1.ok)({ deleted: true });
}
async function bulkUploadProducts(event) {
    const auth = (0, auth_1.getAuth)(event);
    if (!auth?.isAdmin)
        return (0, response_1.forbidden)();
    const body = JSON.parse(event.body ?? "{}");
    const rows = body.rows ?? body;
    if (!Array.isArray(rows))
        return (0, response_1.badRequest)("Expected array of products");
    const createdProducts = [];
    const errors = [];
    for (let i = 0; i < rows.length; i++) {
        const parsed = shared_1.bulkProductRowSchema.safeParse(rows[i]);
        if (!parsed.success) {
            errors.push({ row: i + 1, error: parsed.error.message });
            continue;
        }
        const slug = (0, db_1.slugify)(parsed.data.name);
        const timestamp = (0, db_1.now)();
        const tags = parsed.data.tags
            ? parsed.data.tags.split(",").map((t) => t.trim()).filter(Boolean)
            : [];
        const item = {
            ...parsed.data,
            slug,
            tags,
            images: [],
            videos: [],
            priceTiers: [],
            sampleMaxQty: 1,
            shipsInternational: true,
            leadTimeDays: 3,
            PK: shared_1.productKeys.pk(slug),
            SK: shared_1.productKeys.sk(),
            GSI1PK: shared_1.productKeys.gsi1pk(parsed.data.categorySlug),
            GSI1SK: shared_1.productKeys.gsi1sk(slug),
            createdAt: timestamp,
            updatedAt: timestamp,
        };
        await db_1.docClient.send(new lib_dynamodb_1.PutCommand({ TableName: db_1.PRODUCTS_TABLE, Item: item }));
        createdProducts.push(item);
    }
    return (0, response_1.ok)({ created: createdProducts.length, errors, products: createdProducts });
}
/** Seller: list own products. */
async function listSellerProducts(event) {
    const auth = (0, auth_1.getAuth)(event);
    if (!auth)
        return (0, response_1.unauthorized)();
    const seller = await getSellerForUser(auth.userId);
    if (!seller)
        return (0, response_1.notFound)("Seller profile not found");
    const result = await db_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: db_1.PRODUCTS_TABLE,
        IndexName: "GSI2",
        KeyConditionExpression: "GSI2PK = :pk",
        ExpressionAttributeValues: { ":pk": shared_1.productKeys.gsi2pk(seller.sellerId) },
    }));
    const items = (result.Items ?? []).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return (0, response_1.ok)({ products: items.map(images_1.withResolvedProductImages), seller });
}
/** Seller: create a product via the listing wizard. */
async function createSellerProduct(event) {
    const auth = (0, auth_1.getAuth)(event);
    if (!auth)
        return (0, response_1.unauthorized)();
    const seller = await getSellerForUser(auth.userId);
    if (!seller)
        return (0, response_1.notFound)("Seller profile not found. Complete seller registration first.");
    if (!canSellerList(seller))
        return (0, response_1.forbidden)("Seller account is not active");
    const body = JSON.parse(event.body ?? "{}");
    const parsed = shared_1.createProductSchema.safeParse(body);
    if (!parsed.success)
        return (0, response_1.badRequest)(parsed.error.message);
    const slug = (0, db_1.slugify)(parsed.data.name);
    const timestamp = (0, db_1.now)();
    const inventory = parsed.data.inventory ?? shared_1.DEFAULT_PRODUCT_INVENTORY;
    const existing = await db_1.docClient.send(new lib_dynamodb_1.GetCommand({
        TableName: db_1.PRODUCTS_TABLE,
        Key: { PK: shared_1.productKeys.pk(slug), SK: shared_1.productKeys.sk() },
    }));
    if (existing.Item)
        return (0, response_1.badRequest)("A product with a similar name already exists");
    const item = {
        ...parsed.data,
        sellerId: seller.sellerId,
        inventory,
        slug,
        currency: parsed.data.currency ?? "INR",
        published: parsed.data.published ?? false,
        PK: shared_1.productKeys.pk(slug),
        SK: shared_1.productKeys.sk(),
        GSI1PK: shared_1.productKeys.gsi1pk(parsed.data.categorySlug),
        GSI1SK: shared_1.productKeys.gsi1sk(slug),
        GSI2PK: shared_1.productKeys.gsi2pk(seller.sellerId),
        GSI2SK: shared_1.productKeys.gsi2sk(slug),
        createdAt: timestamp,
        updatedAt: timestamp,
    };
    await db_1.docClient.send(new lib_dynamodb_1.PutCommand({ TableName: db_1.PRODUCTS_TABLE, Item: item }));
    await db_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
        TableName: db_1.SELLERS_TABLE,
        Key: { PK: shared_1.sellerKeys.pk(seller.sellerId), SK: shared_1.sellerKeys.sk() },
        UpdateExpression: "SET productCount = if_not_exists(productCount, :zero) + :one, updatedAt = :at",
        ExpressionAttributeValues: { ":zero": 0, ":one": 1, ":at": timestamp },
    }));
    return (0, response_1.created)({ product: (0, images_1.withResolvedProductImages)(item) });
}
/** Seller: update own product. */
async function updateSellerProduct(event) {
    const auth = (0, auth_1.getAuth)(event);
    if (!auth)
        return (0, response_1.unauthorized)();
    const slug = event.pathParameters?.slug;
    if (!slug)
        return (0, response_1.badRequest)("Slug required");
    const seller = await getSellerForUser(auth.userId);
    if (!seller)
        return (0, response_1.notFound)("Seller profile not found");
    const existing = await db_1.docClient.send(new lib_dynamodb_1.GetCommand({
        TableName: db_1.PRODUCTS_TABLE,
        Key: { PK: shared_1.productKeys.pk(slug), SK: shared_1.productKeys.sk() },
    }));
    if (!existing.Item)
        return (0, response_1.notFound)("Product not found");
    const previous = existing.Item;
    if (previous.sellerId !== seller.sellerId && !auth.isAdmin)
        return (0, response_1.forbidden)();
    const body = JSON.parse(event.body ?? "{}");
    const parsed = shared_1.updateProductSchema.safeParse(body);
    if (!parsed.success)
        return (0, response_1.badRequest)(parsed.error.message);
    const updated = {
        ...previous,
        ...parsed.data,
        updatedAt: (0, db_1.now)(),
    };
    if (parsed.data.categorySlug) {
        updated.GSI1PK = shared_1.productKeys.gsi1pk(parsed.data.categorySlug);
        updated.GSI1SK = shared_1.productKeys.gsi1sk(slug);
    }
    await db_1.docClient.send(new lib_dynamodb_1.PutCommand({ TableName: db_1.PRODUCTS_TABLE, Item: updated }));
    if (parsed.data.inventory !== undefined) {
        await (0, inventory_1.syncInventoryAlertState)(slug, previous, parsed.data.inventory);
    }
    return (0, response_1.ok)({ product: (0, images_1.withResolvedProductImages)(updated) });
}
