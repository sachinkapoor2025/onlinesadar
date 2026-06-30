import { getApiUrl } from "@/lib/env";

type ApiOptions = RequestInit & {
  sessionId?: string;
  token?: string;
  /** Server ISR seconds. Use `false` for no-store. Default: no-store when authed, else 300s. */
  revalidate?: number | false;
};

async function fetchWithRetry(url: string, init: RequestInit, attempts = 3): Promise<Response> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, init);
      if (res.ok || res.status < 500) return res;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
    }
    if (i < attempts - 1) {
      await new Promise((r) => setTimeout(r, 250 * (i + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Fetch failed");
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { sessionId, token, revalidate, ...fetchOptions } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (sessionId) headers["X-Session-Id"] = sessionId;
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const url = `${getApiUrl()}${path}`;

  const isServer = typeof window === "undefined";
  const needsFresh = Boolean(sessionId || token || revalidate === false);
  const cacheOptions: Pick<RequestInit, "cache" | "next"> = isServer
    ? needsFresh
      ? { cache: "no-store" }
      : { next: { revalidate: typeof revalidate === "number" ? revalidate : 300 } }
    : { cache: "default" };

  const res = await fetchWithRetry(url, {
    ...fetchOptions,
    headers,
    ...cacheOptions,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `API error (${res.status})`);
  }

  return res.json();
}

export { getApiUrl as API_URL };
