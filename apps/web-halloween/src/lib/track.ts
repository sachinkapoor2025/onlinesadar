"use client";

import { getApiUrl } from "./env";
import { getOrCreateSessionId } from "./session";
import { EVENT_TYPES, type EventType, parseClientDevice } from "@hr-ecom/shared";

interface TrackPayload {
  type: EventType;
  path?: string;
  productSlug?: string;
  query?: string;
  resultCount?: number;
  value?: number;
  metadata?: Record<string, string>;
  /** Send right away (page views, purchases). */
  immediate?: boolean;
}

interface QueuedEvent extends TrackPayload {
  sessionId: string;
  referrer?: string;
  at: string;
  metadata: Record<string, string>;
}

const BATCH_SIZE = 8;
const FLUSH_DELAY_MS = 1200;

let queue: QueuedEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let clientMeta: Record<string, string> | null = null;
let geoPromise: Promise<void> | null = null;

function endpoint(): string {
  return `${getApiUrl()}/events`;
}

function applyGeoFields(data: Record<string, string | undefined>) {
  clientMeta = clientMeta ?? {};
  for (const key of ["country", "city", "region", "regionName"] as const) {
    const value = data[key];
    if (value) clientMeta[key] = value;
  }
}

/** Load city/state/country from /api/geo (CloudFront headers on Amplify). */
export function ensureVisitorGeo(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (clientMeta?.country && clientMeta?.city) return Promise.resolve();
  if (!geoPromise) {
    geoPromise = fetch("/api/geo", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data === "object") {
          applyGeoFields(data as Record<string, string | undefined>);
        }
      })
      .catch(() => {
        /* analytics must never break UX */
      });
  }
  return geoPromise;
}

function getClientMetadata(): Record<string, string> {
  if (clientMeta) return clientMeta;
  clientMeta = {};
  try {
    clientMeta.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    clientMeta.locale = navigator.language;
    if (screen?.width) clientMeta.screen = `${screen.width}x${screen.height}`;
    if (typeof navigator !== "undefined" && navigator.userAgent) {
      const device = parseClientDevice(navigator.userAgent);
      clientMeta.userAgent = device.userAgent;
      clientMeta.deviceType = device.deviceType;
      clientMeta.browser = device.browser;
      clientMeta.os = device.os;
    }
  } catch {
    /* ignore */
  }
  return clientMeta;
}

/** Send everything queued right now (used on unload + when batch fills). */
export function flushEvents(): void {
  if (typeof window === "undefined" || queue.length === 0) return;
  const events = queue.map(({ immediate: _i, ...rest }) => rest);
  queue = [];
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }

  const body = JSON.stringify({ events });

  fetch(endpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    /* analytics must never break UX */
  });
}

function scheduleFlush(immediate = false): void {
  if (queue.length >= BATCH_SIZE || immediate) {
    flushEvents();
    return;
  }
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    flushEvents();
  }, FLUSH_DELAY_MS);
}

export function track(payload: TrackPayload): void {
  if (typeof window === "undefined") return;
  const sessionId = getOrCreateSessionId();
  if (!sessionId) return;

  queue.push({
    ...payload,
    sessionId,
    path: payload.path ?? window.location.pathname + window.location.search,
    referrer: document.referrer || undefined,
    at: new Date().toISOString(),
    metadata: { ...getClientMetadata(), ...payload.metadata },
  });

  scheduleFlush(payload.immediate);
}

export const trackPageView = (path?: string) =>
  track({ type: EVENT_TYPES.PAGE_VIEW, path, immediate: true });
export const trackProductView = (productSlug: string) =>
  track({ type: EVENT_TYPES.PRODUCT_VIEW, productSlug });
export const trackSearch = (query: string, resultCount: number) =>
  track({ type: EVENT_TYPES.SEARCH, query, resultCount });
export const trackCartAdd = (productSlug: string, value?: number) =>
  track({ type: EVENT_TYPES.CART_ADD, productSlug, value });
export const trackCartRemove = (productSlug: string) =>
  track({ type: EVENT_TYPES.CART_REMOVE, productSlug });
export const trackCheckoutStart = (value?: number) =>
  track({ type: EVENT_TYPES.CHECKOUT_START, value, immediate: true });

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    uetq?: unknown[] & { push: (...args: unknown[]) => void };
  }
}

/** Fire purchase to GTM, GA4, Meta Pixel, and Bing UET (when loaded). */
function pushPurchaseToAdPixels(value: number, metadata?: Record<string, string>): void {
  if (typeof window === "undefined") return;

  const currency = metadata?.currency === "INR" ? "INR" : "USD";
  const transactionId = metadata?.orderId;
  const payload = { value, currency, transaction_id: transactionId };

  try {
    window.dataLayer?.push({
      event: "purchase",
      ecommerce: {
        transaction_id: transactionId,
        value,
        currency,
      },
    });
  } catch {
    /* analytics must never break UX */
  }

  try {
    window.gtag?.("event", "purchase", payload);
  } catch {
    /* ignore */
  }

  try {
    window.fbq?.("track", "Purchase", { value, currency });
  } catch {
    /* ignore */
  }

  try {
    window.uetq?.push("event", "purchase", { revenue_value: value, currency });
  } catch {
    /* ignore */
  }
}

export const trackPurchase = (value?: number, metadata?: Record<string, string>) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    pushPurchaseToAdPixels(value, metadata);
  }
  track({ type: EVENT_TYPES.PURCHASE, value, metadata, immediate: true });
};
