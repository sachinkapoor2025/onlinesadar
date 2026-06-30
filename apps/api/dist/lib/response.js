"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.json = json;
exports.corsPreflight = corsPreflight;
exports.ok = ok;
exports.created = created;
exports.badRequest = badRequest;
exports.unauthorized = unauthorized;
exports.forbidden = forbidden;
exports.notFound = notFound;
exports.serverError = serverError;
const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Session-Id",
};
function json(statusCode, body) {
    return {
        statusCode,
        headers: {
            "Content-Type": "application/json",
            ...CORS_HEADERS,
        },
        body: JSON.stringify(body),
    };
}
/** Browsers require 2xx on CORS preflight — API Gateway forwards OPTIONS to Lambda. */
function corsPreflight() {
    return {
        statusCode: 204,
        headers: CORS_HEADERS,
        body: "",
    };
}
function ok(body) {
    return json(200, body);
}
function created(body) {
    return json(201, body);
}
function badRequest(message) {
    return json(400, { error: message });
}
function unauthorized(message = "Unauthorized") {
    return json(401, { error: message });
}
function forbidden(message = "Forbidden") {
    return json(403, { error: message });
}
function notFound(message = "Not found") {
    return json(404, { error: message });
}
function serverError(message = "Internal server error") {
    return json(500, { error: message });
}
