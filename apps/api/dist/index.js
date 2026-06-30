"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const router_1 = require("./router");
async function handler(event, _context) {
    try {
        return await (0, router_1.route)(event);
    }
    catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Session-Id",
            },
            body: JSON.stringify({ error: "Internal server error" }),
        };
    }
}
