import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import { ok, badRequest, forbidden } from "../lib/response";
import { getAuth } from "../lib/auth";

const BUCKET = process.env.UPLOAD_BUCKET;
const CDN_DOMAIN = process.env.CLOUDFRONT_DOMAIN;
const LOCAL_UPLOAD_DIR = path.join(process.cwd(), "uploads");

function getS3(): S3Client | null {
  if (!BUCKET || process.env.USE_LOCAL_UPLOADS === "true") return null;
  return new S3Client({ region: process.env.AWS_REGION ?? "us-east-1" });
}

function publicUrl(key: string): string {
  if (CDN_DOMAIN) return `https://${CDN_DOMAIN}/${key}`;
  if (process.env.USE_LOCAL_UPLOADS === "true") {
    const base = process.env.LOCAL_API_URL ?? "http://localhost:3001";
    return `${base}/uploads/${key}`;
  }
  return `https://${BUCKET}.s3.amazonaws.com/${key}`;
}

export async function getUploadUrl(event: APIGatewayProxyEventV2) {
  const auth = getAuth(event);
  if (!auth?.isAdmin) return forbidden();

  const body = JSON.parse(event.body ?? "{}");
  const filename = body.filename as string;
  const contentType = (body.contentType as string) ?? "image/jpeg";

  if (!filename) return badRequest("filename required");

  const ext = path.extname(filename) || ".jpg";
  const key = `products/${uuidv4()}${ext}`;

  const s3 = getS3();
  if (!s3) {
    return ok({
      mode: "local",
      key,
      uploadUrl: `${process.env.LOCAL_API_URL ?? "http://localhost:3001"}/uploads/direct/${key}`,
      publicUrl: publicUrl(key),
    });
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
  return ok({ mode: "s3", key, uploadUrl, publicUrl: publicUrl(key) });
}

export async function attachImageToProduct(event: APIGatewayProxyEventV2) {
  const auth = getAuth(event);
  if (!auth?.isAdmin) return forbidden();

  const slug = event.pathParameters?.slug;
  if (!slug) return badRequest("Slug required");

  const body = JSON.parse(event.body ?? "{}");
  const imageUrl = body.imageUrl as string;
  if (!imageUrl) return badRequest("imageUrl required");

  const { GetCommand, PutCommand } = await import("@aws-sdk/lib-dynamodb");
  const { docClient, PRODUCTS_TABLE, now } = await import("../lib/db");
  const { productKeys } = await import("@onlinesadar/shared");

  const existing = await docClient.send(
    new GetCommand({
      TableName: PRODUCTS_TABLE,
      Key: { PK: productKeys.pk(slug), SK: productKeys.sk() },
    })
  );
  if (!existing.Item) return badRequest("Product not found");

  const images = [...((existing.Item.images as string[]) ?? []), imageUrl];
  const updated = { ...existing.Item, images, updatedAt: now() };

  await docClient.send(new PutCommand({ TableName: PRODUCTS_TABLE, Item: updated }));
  return ok({ product: updated });
}

/** Local dev: save uploaded file to disk */
export function saveLocalUpload(key: string, data: Buffer): string {
  if (!fs.existsSync(LOCAL_UPLOAD_DIR)) {
    fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
  }
  const filePath = path.join(LOCAL_UPLOAD_DIR, key.replace(/\//g, "_"));
  fs.writeFileSync(filePath, data);
  return publicUrl(key);
}

export function readLocalUpload(key: string): Buffer | null {
  const filePath = path.join(LOCAL_UPLOAD_DIR, key.replace(/\//g, "_"));
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath);
}

export function getContentType(key: string): string {
  const ext = path.extname(key).toLowerCase();
  const map: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
  };
  return map[ext] ?? "application/octet-stream";
}
