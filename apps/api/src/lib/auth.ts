import type { APIGatewayProxyEventV2 } from "aws-lambda";

export interface AuthContext {
  userId: string;
  email: string;
  isAdmin: boolean;
  isSeller: boolean;
  role: "admin" | "seller" | "buyer";
}

const DEV_AUTH_ENABLED =
  process.env.DEV_AUTH_ENABLED === "true" || process.env.ENVIRONMENT === "local";

function resolveRole(groups: string[], devRole?: string): AuthContext["role"] {
  if (groups.includes("admin") || devRole === "admin") return "admin";
  if (groups.includes("seller") || devRole === "seller") return "seller";
  return "buyer";
}

/** Decode JWT payload or dev token for local testing. */
export function getAuth(event: APIGatewayProxyEventV2): AuthContext | null {
  const authHeader = event.headers?.authorization ?? event.headers?.Authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);

  if (token.startsWith("dev:") && DEV_AUTH_ENABLED) {
    const [, email, role] = token.split(":");
    if (!email) return null;
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
    const groups: string[] = payload["cognito:groups"] ?? [];
    const role = resolveRole(groups);
    return {
      userId: payload.sub as string,
      email: (payload.email as string) ?? "",
      isAdmin: role === "admin",
      isSeller: role === "seller",
      role,
    };
  } catch {
    return null;
  }
}

export function getSessionId(event: APIGatewayProxyEventV2): string | undefined {
  return event.headers?.["x-session-id"] ?? event.headers?.["X-Session-Id"];
}

export function getUserOrSessionKey(event: APIGatewayProxyEventV2): string | null {
  const auth = getAuth(event);
  if (auth) return auth.userId;
  const sessionId = getSessionId(event);
  return sessionId ?? null;
}

export function requireAdmin(event: APIGatewayProxyEventV2): AuthContext | null {
  const auth = getAuth(event);
  if (!auth?.isAdmin) return null;
  return auth;
}

export function requireSellerOrAdmin(event: APIGatewayProxyEventV2): AuthContext | null {
  const auth = getAuth(event);
  if (!auth?.isAdmin && !auth?.isSeller) return null;
  return auth;
}
