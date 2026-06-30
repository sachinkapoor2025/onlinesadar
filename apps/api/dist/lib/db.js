"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_TABLES = exports.SELLERS_TABLE = exports.CONFIG_TABLE = exports.EVENTS_TABLE = exports.CUSTOMERS_TABLE = exports.CARTS_TABLE = exports.ORDERS_TABLE = exports.PRODUCTS_TABLE = exports.docClient = void 0;
exports.now = now;
exports.ttlInDays = ttlInDays;
exports.dayBucket = dayBucket;
exports.slugify = slugify;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const memory_store_1 = require("./memory-store");
const useMemory = process.env.USE_MEMORY_DB === "true";
const endpoint = process.env.DYNAMODB_ENDPOINT;
const client = useMemory
    ? null
    : new client_dynamodb_1.DynamoDBClient({
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
exports.docClient = useMemory
    ? memory_store_1.memoryStore
    : lib_dynamodb_1.DynamoDBDocumentClient.from(client, {
        marshallOptions: { removeUndefinedValues: true },
    });
const ENV = process.env.ENVIRONMENT ?? "dev";
/** Per-domain tables (multi-table design). Each can be overridden by env var. */
exports.PRODUCTS_TABLE = process.env.PRODUCTS_TABLE ?? `onlinesadar-products-${ENV}`;
exports.ORDERS_TABLE = process.env.ORDERS_TABLE ?? `onlinesadar-orders-${ENV}`;
exports.CARTS_TABLE = process.env.CARTS_TABLE ?? `onlinesadar-carts-${ENV}`;
exports.CUSTOMERS_TABLE = process.env.CUSTOMERS_TABLE ?? `onlinesadar-customers-${ENV}`;
exports.EVENTS_TABLE = process.env.EVENTS_TABLE ?? `onlinesadar-events-${ENV}`;
exports.CONFIG_TABLE = process.env.CONFIG_TABLE ?? `onlinesadar-config-${ENV}`;
exports.SELLERS_TABLE = process.env.SELLERS_TABLE ?? `onlinesadar-sellers-${ENV}`;
/** All table names, useful for setup/migration scripts. */
exports.ALL_TABLES = {
    products: exports.PRODUCTS_TABLE,
    orders: exports.ORDERS_TABLE,
    carts: exports.CARTS_TABLE,
    customers: exports.CUSTOMERS_TABLE,
    events: exports.EVENTS_TABLE,
    config: exports.CONFIG_TABLE,
    sellers: exports.SELLERS_TABLE,
};
function now() {
    return new Date().toISOString();
}
/** Epoch-seconds TTL value `days` in the future. */
function ttlInDays(days) {
    return Math.floor(Date.now() / 1000) + days * 24 * 60 * 60;
}
/** UTC day bucket (YYYY-MM-DD) for rollups/analytics. */
function dayBucket(date = new Date()) {
    return date.toISOString().slice(0, 10);
}
function slugify(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
}
