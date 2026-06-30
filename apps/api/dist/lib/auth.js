"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuth = getAuth;
exports.getSessionId = getSessionId;
exports.getUserOrSessionKey = getUserOrSessionKey;
exports.requireAdmin = requireAdmin;
exports.requireSellerOrAdmin = requireSellerOrAdmin;
const DEV_AUTH_ENABLED = process.env.DEV_AUTH_ENABLED === "true" || process.env.ENVIRONMENT === "local";
function resolveRole(groups, devRole) {
    if (groups.includes("admin") || devRole === "admin")
        return "admin";
    if (groups.includes("seller") || devRole === "seller")
        return "seller";
    return "buyer";
}
/** Decode JWT payload or dev token for local testing. */
function getAuth(event) {
    const authHeader = event.headers?.authorization ?? event.headers?.Authorization;
    if (!authHeader?.startsWith("Bearer "))
        return null;
    const token = authHeader.slice(7);
    if (token.startsWith("dev:") && DEV_AUTH_ENABLED) {
        const [, email, role] = token.split(":");
        if (!email)
            return null;
        const resolved = resolveRole([], role);
        return {
            userId: `dev-${email}`,
            email,
            isAdmin: resolved === "admin",
            isSeller: resolved === "seller",
            role: resolved,
        };
    }
    try {
        const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
        const groups = payload["cognito:groups"] ?? [];
        const role = resolveRole(groups);
        return {
            userId: payload.sub,
            email: payload.email ?? "",
            isAdmin: role === "admin",
            isSeller: role === "seller",
            role,
        };
    }
    catch {
        return null;
    }
}
function getSessionId(event) {
    return event.headers?.["x-session-id"] ?? event.headers?.["X-Session-Id"];
}
function getUserOrSessionKey(event) {
    const auth = getAuth(event);
    if (auth)
        return auth.userId;
    const sessionId = getSessionId(event);
    return sessionId ?? null;
}
function requireAdmin(event) {
    const auth = getAuth(event);
    if (!auth?.isAdmin)
        return null;
    return auth;
}
function requireSellerOrAdmin(event) {
    const auth = getAuth(event);
    if (!auth?.isAdmin && !auth?.isSeller)
        return null;
    return auth;
}
