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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUploadUrl = getUploadUrl;
exports.attachImageToProduct = attachImageToProduct;
exports.saveLocalUpload = saveLocalUpload;
exports.readLocalUpload = readLocalUpload;
exports.getContentType = getContentType;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const uuid_1 = require("uuid");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const response_1 = require("../lib/response");
const auth_1 = require("../lib/auth");
const BUCKET = process.env.UPLOAD_BUCKET;
const CDN_DOMAIN = process.env.CLOUDFRONT_DOMAIN;
const LOCAL_UPLOAD_DIR = path_1.default.join(process.cwd(), "uploads");
function getS3() {
    if (!BUCKET || process.env.USE_LOCAL_UPLOADS === "true")
        return null;
    return new client_s3_1.S3Client({ region: process.env.AWS_REGION ?? "us-east-1" });
}
function publicUrl(key) {
    if (CDN_DOMAIN)
        return `https://${CDN_DOMAIN}/${key}`;
    if (process.env.USE_LOCAL_UPLOADS === "true") {
        const base = process.env.LOCAL_API_URL ?? "http://localhost:3001";
        return `${base}/uploads/${key}`;
    }
    return `https://${BUCKET}.s3.amazonaws.com/${key}`;
}
async function getUploadUrl(event) {
    const auth = (0, auth_1.getAuth)(event);
    if (!auth?.isAdmin)
        return (0, response_1.forbidden)();
    const body = JSON.parse(event.body ?? "{}");
    const filename = body.filename;
    const contentType = body.contentType ?? "image/jpeg";
    if (!filename)
        return (0, response_1.badRequest)("filename required");
    const ext = path_1.default.extname(filename) || ".jpg";
    const key = `products/${(0, uuid_1.v4)()}${ext}`;
    const s3 = getS3();
    if (!s3) {
        return (0, response_1.ok)({
            mode: "local",
            key,
            uploadUrl: `${process.env.LOCAL_API_URL ?? "http://localhost:3001"}/uploads/direct/${key}`,
            publicUrl: publicUrl(key),
        });
    }
    const command = new client_s3_1.PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        ContentType: contentType,
    });
    const uploadUrl = await (0, s3_request_presigner_1.getSignedUrl)(s3, command, { expiresIn: 300 });
    return (0, response_1.ok)({ mode: "s3", key, uploadUrl, publicUrl: publicUrl(key) });
}
async function attachImageToProduct(event) {
    const auth = (0, auth_1.getAuth)(event);
    if (!auth?.isAdmin)
        return (0, response_1.forbidden)();
    const slug = event.pathParameters?.slug;
    if (!slug)
        return (0, response_1.badRequest)("Slug required");
    const body = JSON.parse(event.body ?? "{}");
    const imageUrl = body.imageUrl;
    if (!imageUrl)
        return (0, response_1.badRequest)("imageUrl required");
    const { GetCommand, PutCommand } = await Promise.resolve().then(() => __importStar(require("@aws-sdk/lib-dynamodb")));
    const { docClient, PRODUCTS_TABLE, now } = await Promise.resolve().then(() => __importStar(require("../lib/db")));
    const { productKeys } = await Promise.resolve().then(() => __importStar(require("@onlinesadar/shared")));
    const existing = await docClient.send(new GetCommand({
        TableName: PRODUCTS_TABLE,
        Key: { PK: productKeys.pk(slug), SK: productKeys.sk() },
    }));
    if (!existing.Item)
        return (0, response_1.badRequest)("Product not found");
    const images = [...(existing.Item.images ?? []), imageUrl];
    const updated = { ...existing.Item, images, updatedAt: now() };
    await docClient.send(new PutCommand({ TableName: PRODUCTS_TABLE, Item: updated }));
    return (0, response_1.ok)({ product: updated });
}
/** Local dev: save uploaded file to disk */
function saveLocalUpload(key, data) {
    if (!fs_1.default.existsSync(LOCAL_UPLOAD_DIR)) {
        fs_1.default.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
    }
    const filePath = path_1.default.join(LOCAL_UPLOAD_DIR, key.replace(/\//g, "_"));
    fs_1.default.writeFileSync(filePath, data);
    return publicUrl(key);
}
function readLocalUpload(key) {
    const filePath = path_1.default.join(LOCAL_UPLOAD_DIR, key.replace(/\//g, "_"));
    if (!fs_1.default.existsSync(filePath))
        return null;
    return fs_1.default.readFileSync(filePath);
}
function getContentType(key) {
    const ext = path_1.default.extname(key).toLowerCase();
    const map = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".gif": "image/gif",
    };
    return map[ext] ?? "application/octet-stream";
}
