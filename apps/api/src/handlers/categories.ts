import { PutCommand, GetCommand, ScanCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { createCategorySchema, updateCategorySchema, categoryKeys, type Category } from "@onlinesadar/shared";
import { docClient, PRODUCTS_TABLE, now, slugify } from "../lib/db";
import { ok, created, badRequest, notFound, forbidden } from "../lib/response";
import { getAuth } from "../lib/auth";

export async function listCategories(event: APIGatewayProxyEventV2) {
  const auth = getAuth(event);
  const result = await docClient.send(
    new ScanCommand({
      TableName: PRODUCTS_TABLE,
      FilterExpression: "begins_with(PK, :prefix) AND SK = :sk",
      ExpressionAttributeValues: { ":prefix": "CATEGORY#", ":sk": "META" },
    })
  );

  let categories = (result.Items ?? []) as Category[];
  if (!auth?.isAdmin) {
    categories = categories.filter((c) => c.published !== false);
  }
  categories.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  return ok({ categories });
}

export async function createCategory(event: APIGatewayProxyEventV2) {
  const auth = getAuth(event);
  if (!auth?.isAdmin) return forbidden();

  const body = JSON.parse(event.body ?? "{}");
  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const slug = slugify(parsed.data.name);
  const timestamp = now();
  const item = {
    ...parsed.data,
    slug,
    PK: categoryKeys.pk(slug),
    SK: categoryKeys.sk(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await docClient.send(new PutCommand({ TableName: PRODUCTS_TABLE, Item: item }));
  return created({ category: item });
}

export async function deleteCategory(event: APIGatewayProxyEventV2) {
  const auth = getAuth(event);
  if (!auth?.isAdmin) return forbidden();

  const slug = event.pathParameters?.slug;
  if (!slug) return badRequest("Slug required");

  await docClient.send(
    new DeleteCommand({
      TableName: PRODUCTS_TABLE,
      Key: { PK: categoryKeys.pk(slug), SK: categoryKeys.sk() },
    })
  );
  return ok({ deleted: true });
}

export async function getCategory(event: APIGatewayProxyEventV2) {
  const slug = event.pathParameters?.slug;
  if (!slug) return badRequest("Slug required");

  const result = await docClient.send(
    new GetCommand({
      TableName: PRODUCTS_TABLE,
      Key: { PK: categoryKeys.pk(slug), SK: categoryKeys.sk() },
    })
  );

  if (!result.Item) return notFound("Category not found");
  return ok({ category: result.Item });
}

export async function updateCategory(event: APIGatewayProxyEventV2) {
  const auth = getAuth(event);
  if (!auth?.isAdmin) return forbidden();

  const slug = event.pathParameters?.slug;
  if (!slug) return badRequest("Slug required");

  const existing = await docClient.send(
    new GetCommand({
      TableName: PRODUCTS_TABLE,
      Key: { PK: categoryKeys.pk(slug), SK: categoryKeys.sk() },
    })
  );
  if (!existing.Item) return notFound("Category not found");

  const body = JSON.parse(event.body ?? "{}");
  const parsed = updateCategorySchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const updated = {
    ...existing.Item,
    ...parsed.data,
    updatedAt: now(),
  };

  await docClient.send(new PutCommand({ TableName: PRODUCTS_TABLE, Item: updated }));
  return ok({ category: updated as Category });
}
