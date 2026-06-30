import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { memoryStore } from "./memory-store";

const useMemory = process.env.USE_MEMORY_DB === "true";
const endpoint = process.env.DYNAMODB_ENDPOINT;

const client = useMemory
  ? null
  : new DynamoDBClient({
      region: process.env.AWS_REGION ?? "us-east-1",
      ...(endpoint
        ? {
            endpoint,
            credentials: {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "local",
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "local",
            },
          }
        : {}),
    });

export const docClient = useMemory
  ? (memoryStore as unknown as DynamoDBDocumentClient)
  : DynamoDBDocumentClient.from(client!, {
      marshallOptions: { removeUndefinedValues: true },
    });

const ENV = process.env.ENVIRONMENT ?? "dev";

/** Per-domain tables (multi-table design). Each can be overridden by env var. */
export const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE ?? `onlinesadar-products-${ENV}`;
export const ORDERS_TABLE = process.env.ORDERS_TABLE ?? `onlinesadar-orders-${ENV}`;
export const CARTS_TABLE = process.env.CARTS_TABLE ?? `onlinesadar-carts-${ENV}`;
export const CUSTOMERS_TABLE = process.env.CUSTOMERS_TABLE ?? `onlinesadar-customers-${ENV}`;
export const EVENTS_TABLE = process.env.EVENTS_TABLE ?? `onlinesadar-events-${ENV}`;
export const CONFIG_TABLE = process.env.CONFIG_TABLE ?? `onlinesadar-config-${ENV}`;
export const SELLERS_TABLE = process.env.SELLERS_TABLE ?? `onlinesadar-sellers-${ENV}`;

/** All table names, useful for setup/migration scripts. */
export const ALL_TABLES = {
  products: PRODUCTS_TABLE,
  orders: ORDERS_TABLE,
  carts: CARTS_TABLE,
  customers: CUSTOMERS_TABLE,
  events: EVENTS_TABLE,
  config: CONFIG_TABLE,
  sellers: SELLERS_TABLE,
};

export function now(): string {
  return new Date().toISOString();
}

/** Epoch-seconds TTL value `days` in the future. */
export function ttlInDays(days: number): number {
  return Math.floor(Date.now() / 1000) + days * 24 * 60 * 60;
}

/** UTC day bucket (YYYY-MM-DD) for rollups/analytics. */
export function dayBucket(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
