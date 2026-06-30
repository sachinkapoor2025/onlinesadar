import { PutCommand, GetCommand, QueryCommand, DeleteCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import {
  createProductSchema,
  updateProductSchema,
  bulkProductRowSchema,
  productKeys,
  sellerKeys,
  DEFAULT_PRODUCT_INVENTORY,
  SELLER_STATUS,
  type Product,
  type Seller,
} from "@onlinesadar/shared";
import { docClient, PRODUCTS_TABLE, SELLERS_TABLE, now, slugify } from "../lib/db";
import { ok, created, badRequest, notFound, forbidden, unauthorized } from "../lib/response";
import { getAuth } from "../lib/auth";
import { withResolvedProductImages, resolveProductImageUrl } from "../lib/images";
import { syncInventoryAlertState } from "../lib/inventory";

async function getSellerForUser(userId: string): Promise<Seller | null> {
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
  return (result.Items?.[0] as Seller) ?? null;
}

function canSellerList(seller: Seller): boolean {
  return seller.status === SELLER_STATUS.TRIAL_ACTIVE || seller.status === SELLER_STATUS.VERIFIED;
}

export async function listProducts(event: APIGatewayProxyEventV2) {
  const category = event.queryStringParameters?.category;
  const search = event.queryStringParameters?.search?.toLowerCase();
  const sellerSlug = event.queryStringParameters?.seller;

  let items: Product[] = [];
  let sellerIdFilter: string | undefined;

  if (sellerSlug) {
    const { SELLERS_TABLE } = await import("../lib/db");
    const { sellerKeys } = await import("@onlinesadar/shared");
    const slugRef = await docClient.send(
      new GetCommand({
        TableName: SELLERS_TABLE,
        Key: { PK: sellerKeys.slugPk(sellerSlug), SK: sellerKeys.slugSk() },
      })
    );
    sellerIdFilter = slugRef.Item?.sellerId as string | undefined;
    if (!sellerIdFilter) return ok({ products: [] });
  }

  if (category) {
    const result = await docClient.send(
      new QueryCommand({
        TableName: PRODUCTS_TABLE,
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :pk",
        ExpressionAttributeValues: { ":pk": productKeys.gsi1pk(category) },
      })
    );
    items = (result.Items ?? []) as Product[];
  } else {
    const result = await docClient.send(
      new ScanCommand({
        TableName: PRODUCTS_TABLE,
        FilterExpression: "begins_with(PK, :prefix) AND SK = :sk",
        ExpressionAttributeValues: { ":prefix": "PRODUCT#", ":sk": "META" },
      })
    );
    items = (result.Items ?? []) as Product[];
  }

  items = items.filter((p) => p.published !== false && (p.inventory ?? 0) > 0);
  if (sellerIdFilter) {
    items = items.filter((p) => p.sellerId === sellerIdFilter);
  }
  if (search) {
    items = items.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        p.description.toLowerCase().includes(search) ||
        p.tags?.some((t) => t.toLowerCase().includes(search))
    );
  }

  return ok({ products: items.map(withResolvedProductImages) });
}

export async function getProduct(event: APIGatewayProxyEventV2) {
  const slug = event.pathParameters?.slug;
  if (!slug) return badRequest("Slug required");

  const result = await docClient.send(
    new GetCommand({
      TableName: PRODUCTS_TABLE,
      Key: { PK: productKeys.pk(slug), SK: productKeys.sk() },
    })
  );

  if (!result.Item) return notFound("Product not found");
  const product = result.Item as { published?: boolean };
  if (product.published === false) return notFound("Product not found");
  return ok({ product: withResolvedProductImages(result.Item as Product) });
}

export async function createProduct(event: APIGatewayProxyEventV2) {
  const auth = getAuth(event);
  if (!auth?.isAdmin) return forbidden();

  const body = JSON.parse(event.body ?? "{}");
  const parsed = createProductSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const slug = slugify(parsed.data.name);
  const timestamp = now();
  const inventory = parsed.data.inventory ?? DEFAULT_PRODUCT_INVENTORY;
  const item: Product & { PK: string; SK: string; GSI1PK: string; GSI1SK: string } = {
    ...parsed.data,
    inventory,
    slug,
    PK: productKeys.pk(slug),
    SK: productKeys.sk(),
    GSI1PK: productKeys.gsi1pk(parsed.data.categorySlug),
    GSI1SK: productKeys.gsi1sk(slug),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await docClient.send(new PutCommand({ TableName: PRODUCTS_TABLE, Item: item }));
  return created({ product: item });
}

export async function updateProduct(event: APIGatewayProxyEventV2) {
  const auth = getAuth(event);
  if (!auth?.isAdmin) return forbidden();

  const slug = event.pathParameters?.slug;
  if (!slug) return badRequest("Slug required");

  const existing = await docClient.send(
    new GetCommand({
      TableName: PRODUCTS_TABLE,
      Key: { PK: productKeys.pk(slug), SK: productKeys.sk() },
    })
  );
  if (!existing.Item) return notFound("Product not found");

  const previous = existing.Item as Product;
  const body = JSON.parse(event.body ?? "{}");
  const parsed = updateProductSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const updated = {
    ...previous,
    ...parsed.data,
    updatedAt: now(),
  } as Product & { PK: string; SK: string; GSI1PK: string; GSI1SK: string };

  if (parsed.data.categorySlug) {
    updated.GSI1PK = productKeys.gsi1pk(parsed.data.categorySlug);
    updated.GSI1SK = productKeys.gsi1sk(slug);
  }

  await docClient.send(new PutCommand({ TableName: PRODUCTS_TABLE, Item: updated }));

  if (parsed.data.inventory !== undefined) {
    await syncInventoryAlertState(slug, previous, parsed.data.inventory);
  }

  return ok({ product: updated });
}

/** Admin: list all products including unpublished. */
export async function listAdminProducts(event: APIGatewayProxyEventV2) {
  const auth = getAuth(event);
  if (!auth?.isAdmin) return forbidden();

  const result = await docClient.send(
    new ScanCommand({
      TableName: PRODUCTS_TABLE,
      FilterExpression: "begins_with(PK, :prefix) AND SK = :sk",
      ExpressionAttributeValues: { ":prefix": "PRODUCT#", ":sk": "META" },
    })
  );

  const items = ((result.Items ?? []) as Product[]).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  return ok({ products: items.map(withResolvedProductImages) });
}

export async function deleteProduct(event: APIGatewayProxyEventV2) {
  const auth = getAuth(event);
  if (!auth?.isAdmin) return forbidden();

  const slug = event.pathParameters?.slug;
  if (!slug) return badRequest("Slug required");

  await docClient.send(
    new DeleteCommand({
      TableName: PRODUCTS_TABLE,
      Key: { PK: productKeys.pk(slug), SK: productKeys.sk() },
    })
  );
  return ok({ deleted: true });
}

export async function bulkUploadProducts(event: APIGatewayProxyEventV2) {
  const auth = getAuth(event);
  if (!auth?.isAdmin) return forbidden();

  const body = JSON.parse(event.body ?? "{}");
  const rows: unknown[] = body.rows ?? body;
  if (!Array.isArray(rows)) return badRequest("Expected array of products");

  const createdProducts: Product[] = [];
  const errors: { row: number; error: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const parsed = bulkProductRowSchema.safeParse(rows[i]);
    if (!parsed.success) {
      errors.push({ row: i + 1, error: parsed.error.message });
      continue;
    }

    const slug = slugify(parsed.data.name);
    const timestamp = now();
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
      PK: productKeys.pk(slug),
      SK: productKeys.sk(),
      GSI1PK: productKeys.gsi1pk(parsed.data.categorySlug),
      GSI1SK: productKeys.gsi1sk(slug),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await docClient.send(new PutCommand({ TableName: PRODUCTS_TABLE, Item: item }));
    createdProducts.push(item as Product);
  }

  return ok({ created: createdProducts.length, errors, products: createdProducts });
}

/** Seller: list own products. */
export async function listSellerProducts(event: APIGatewayProxyEventV2) {
  const auth = getAuth(event);
  if (!auth) return unauthorized();

  const seller = await getSellerForUser(auth.userId);
  if (!seller) return notFound("Seller profile not found");

  const result = await docClient.send(
    new QueryCommand({
      TableName: PRODUCTS_TABLE,
      IndexName: "GSI2",
      KeyConditionExpression: "GSI2PK = :pk",
      ExpressionAttributeValues: { ":pk": productKeys.gsi2pk(seller.sellerId) },
    })
  );

  const items = ((result.Items ?? []) as Product[]).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  return ok({ products: items.map(withResolvedProductImages), seller });
}

/** Seller: create a product via the listing wizard. */
export async function createSellerProduct(event: APIGatewayProxyEventV2) {
  const auth = getAuth(event);
  if (!auth) return unauthorized();

  const seller = await getSellerForUser(auth.userId);
  if (!seller) return notFound("Seller profile not found. Complete seller registration first.");
  if (!canSellerList(seller)) return forbidden("Seller account is not active");

  const body = JSON.parse(event.body ?? "{}");
  const parsed = createProductSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const slug = slugify(parsed.data.name);
  const timestamp = now();
  const inventory = parsed.data.inventory ?? DEFAULT_PRODUCT_INVENTORY;

  const existing = await docClient.send(
    new GetCommand({
      TableName: PRODUCTS_TABLE,
      Key: { PK: productKeys.pk(slug), SK: productKeys.sk() },
    })
  );
  if (existing.Item) return badRequest("A product with a similar name already exists");

  const item: Product & {
    PK: string;
    SK: string;
    GSI1PK: string;
    GSI1SK: string;
    GSI2PK: string;
    GSI2SK: string;
  } = {
    ...parsed.data,
    sellerId: seller.sellerId,
    inventory,
    slug,
    currency: parsed.data.currency ?? "INR",
    published: parsed.data.published ?? false,
    PK: productKeys.pk(slug),
    SK: productKeys.sk(),
    GSI1PK: productKeys.gsi1pk(parsed.data.categorySlug),
    GSI1SK: productKeys.gsi1sk(slug),
    GSI2PK: productKeys.gsi2pk(seller.sellerId),
    GSI2SK: productKeys.gsi2sk(slug),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await docClient.send(new PutCommand({ TableName: PRODUCTS_TABLE, Item: item }));
  await docClient.send(
    new UpdateCommand({
      TableName: SELLERS_TABLE,
      Key: { PK: sellerKeys.pk(seller.sellerId), SK: sellerKeys.sk() },
      UpdateExpression: "SET productCount = if_not_exists(productCount, :zero) + :one, updatedAt = :at",
      ExpressionAttributeValues: { ":zero": 0, ":one": 1, ":at": timestamp },
    })
  );

  return created({ product: withResolvedProductImages(item) });
}

/** Seller: update own product. */
export async function updateSellerProduct(event: APIGatewayProxyEventV2) {
  const auth = getAuth(event);
  if (!auth) return unauthorized();

  const slug = event.pathParameters?.slug;
  if (!slug) return badRequest("Slug required");

  const seller = await getSellerForUser(auth.userId);
  if (!seller) return notFound("Seller profile not found");

  const existing = await docClient.send(
    new GetCommand({
      TableName: PRODUCTS_TABLE,
      Key: { PK: productKeys.pk(slug), SK: productKeys.sk() },
    })
  );
  if (!existing.Item) return notFound("Product not found");

  const previous = existing.Item as Product;
  if (previous.sellerId !== seller.sellerId && !auth.isAdmin) return forbidden();

  const body = JSON.parse(event.body ?? "{}");
  const parsed = updateProductSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const updated = {
    ...previous,
    ...parsed.data,
    updatedAt: now(),
  } as Product & { PK: string; SK: string; GSI1PK: string; GSI1SK: string; GSI2PK?: string; GSI2SK?: string };

  if (parsed.data.categorySlug) {
    updated.GSI1PK = productKeys.gsi1pk(parsed.data.categorySlug);
    updated.GSI1SK = productKeys.gsi1sk(slug);
  }

  await docClient.send(new PutCommand({ TableName: PRODUCTS_TABLE, Item: updated }));

  if (parsed.data.inventory !== undefined) {
    await syncInventoryAlertState(slug, previous, parsed.data.inventory);
  }

  return ok({ product: withResolvedProductImages(updated) });
}
