"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Local dev server — mimics API Gateway + local file uploads.
 */
const crypto_1 = __importDefault(require("crypto"));
const http_1 = __importDefault(require("http"));
const index_1 = require("./index");
const uploads_1 = require("./handlers/uploads");
const seed_1 = require("./lib/seed");
const PORT = process.env.PORT ?? 3001;
(0, seed_1.seedIfEmpty)().then(() => {
    server.listen(PORT, () => {
        console.log(`API running at http://localhost:${PORT}`);
        if (process.env.USE_MEMORY_DB === "true") {
            console.log("Using in-memory database (demo data auto-seeded)");
        }
    });
});
const server = http_1.default.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", async () => {
        const rawBody = Buffer.concat(chunks);
        // Serve local uploads
        const uploadMatch = url.pathname.match(/^\/uploads\/(.+)$/);
        if (uploadMatch && req.method === "GET") {
            const key = uploadMatch[1].replace(/_/g, "/");
            const data = (0, uploads_1.readLocalUpload)(key);
            if (!data) {
                res.statusCode = 404;
                res.end("Not found");
                return;
            }
            res.statusCode = 200;
            res.setHeader("Content-Type", (0, uploads_1.getContentType)(key));
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.end(data);
            return;
        }
        // Local direct upload (PUT)
        const directMatch = url.pathname.match(/^\/uploads\/direct\/(.+)$/);
        if (directMatch && req.method === "PUT") {
            const key = directMatch[1];
            (0, uploads_1.saveLocalUpload)(key, rawBody);
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.end(JSON.stringify({ ok: true, key }));
            return;
        }
        if (req.method === "OPTIONS") {
            res.statusCode = 204;
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
            res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Session-Id");
            res.end();
            return;
        }
        const event = {
            version: "2.0",
            routeKey: `${req.method} ${url.pathname}`,
            rawPath: url.pathname,
            rawQueryString: url.search.slice(1),
            headers: Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v ?? ""])),
            queryStringParameters: Object.fromEntries(url.searchParams),
            requestContext: {
                accountId: "local",
                apiId: "local",
                domainName: "localhost",
                domainPrefix: "local",
                http: {
                    method: req.method ?? "GET",
                    path: url.pathname,
                    protocol: "HTTP/1.1",
                    sourceIp: "127.0.0.1",
                    userAgent: req.headers["user-agent"] ?? "",
                },
                requestId: crypto_1.default.randomUUID(),
                routeKey: `${req.method} ${url.pathname}`,
                stage: "local",
                time: new Date().toISOString(),
                timeEpoch: Date.now(),
            },
            body: rawBody.length ? rawBody.toString() : undefined,
            isBase64Encoded: false,
        };
        const result = await (0, index_1.handler)(event, {});
        const response = typeof result === "string"
            ? { statusCode: 200, headers: {}, body: result }
            : result;
        res.statusCode = response.statusCode ?? 200;
        if (response.headers) {
            for (const [k, v] of Object.entries(response.headers)) {
                if (typeof v === "string")
                    res.setHeader(k, v);
            }
        }
        res.end(typeof response.body === "string" ? response.body : "");
    });
});
