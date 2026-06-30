"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCategories = listCategories;
exports.createCategory = createCategory;
exports.deleteCategory = deleteCategory;
exports.getCategory = getCategory;
exports.updateCategory = updateCategory;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const shared_1 = require("@onlinesadar/shared");
const db_1 = require("../lib/db");
const response_1 = require("../lib/response");
const auth_1 = require("../lib/auth");
async function listCategories(event) {
    const auth = (0, auth_1.getAuth)(event);
    const result = await db_1.docClient.send(new lib_dynamodb_1.ScanCommand({
        TableName: db_1.PRODUCTS_TABLE,
        FilterExpression: "begins_with(PK, :prefix) AND SK = :sk",
        ExpressionAttributeValues: { ":prefix": "CATEGORY#", ":sk": "META" },
    }));
    let categories = (result.Items ?? []);
    if (!auth?.isAdmin) {
        categories = categories.filter((c) => c.published !== false);
    }
    categories.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    return (0, response_1.ok)({ categories });
}
async function createCategory(event) {
    const auth = (0, auth_1.getAuth)(event);
    if (!auth?.isAdmin)
        return (0, response_1.forbidden)();
    const body = JSON.parse(event.body ?? "{}");
    const parsed = shared_1.createCategorySchema.safeParse(body);
    if (!parsed.success)
        return (0, response_1.badRequest)(parsed.error.message);
    const slug = (0, db_1.slugify)(parsed.data.name);
    const timestamp = (0, db_1.now)();
    const item = {
        ...parsed.data,
        slug,
        PK: shared_1.categoryKeys.pk(slug),
        SK: shared_1.categoryKeys.sk(),
        createdAt: timestamp,
        updatedAt: timestamp,
    };
    await db_1.docClient.send(new lib_dynamodb_1.PutCommand({ TableName: db_1.PRODUCTS_TABLE, Item: item }));
    return (0, response_1.created)({ category: item });
}
async function deleteCategory(event) {
    const auth = (0, auth_1.getAuth)(event);
    if (!auth?.isAdmin)
        return (0, response_1.forbidden)();
    const slug = event.pathParameters?.slug;
    if (!slug)
        return (0, response_1.badRequest)("Slug required");
    await db_1.docClient.send(new lib_dynamodb_1.DeleteCommand({
        TableName: db_1.PRODUCTS_TABLE,
        Key: { PK: shared_1.categoryKeys.pk(slug), SK: shared_1.categoryKeys.sk() },
    }));
    return (0, response_1.ok)({ deleted: true });
}
async function getCategory(event) {
    const slug = event.pathParameters?.slug;
    if (!slug)
        return (0, response_1.badRequest)("Slug required");
    const result = await db_1.docClient.send(new lib_dynamodb_1.GetCommand({
        TableName: db_1.PRODUCTS_TABLE,
        Key: { PK: shared_1.categoryKeys.pk(slug), SK: shared_1.categoryKeys.sk() },
    }));
    if (!result.Item)
        return (0, response_1.notFound)("Category not found");
    return (0, response_1.ok)({ category: result.Item });
}
async function updateCategory(event) {
    const auth = (0, auth_1.getAuth)(event);
    if (!auth?.isAdmin)
        return (0, response_1.forbidden)();
    const slug = event.pathParameters?.slug;
    if (!slug)
        return (0, response_1.badRequest)("Slug required");
    const existing = await db_1.docClient.send(new lib_dynamodb_1.GetCommand({
        TableName: db_1.PRODUCTS_TABLE,
        Key: { PK: shared_1.categoryKeys.pk(slug), SK: shared_1.categoryKeys.sk() },
    }));
    if (!existing.Item)
        return (0, response_1.notFound)("Category not found");
    const body = JSON.parse(event.body ?? "{}");
    const parsed = shared_1.updateCategorySchema.safeParse(body);
    if (!parsed.success)
        return (0, response_1.badRequest)(parsed.error.message);
    const updated = {
        ...existing.Item,
        ...parsed.data,
        updatedAt: (0, db_1.now)(),
    };
    await db_1.docClient.send(new lib_dynamodb_1.PutCommand({ TableName: db_1.PRODUCTS_TABLE, Item: updated }));
    return (0, response_1.ok)({ category: updated });
}
