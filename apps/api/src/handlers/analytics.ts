import { QueryCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import {
  eventKeys,
  customerKeys,
  orderKeys,
  EVENT_TYPES,
  ORDER_STATUS,
  viewerGeoFromMetadata,
  isRevenueOrder,
  getOrderPaidAt,
  type Order,
} from "@onlinesadar/shared";
import { docClient, EVENTS_TABLE, CUSTOMERS_TABLE, ORDERS_TABLE, dayBucket, now } from "../lib/db";
import { ok, forbidden, badRequest } from "../lib/response";
import { requireAdmin } from "../lib/auth";

type RollupItem = Record<string, unknown> & { SK: string; kind?: string; label?: string };

function rangeDays(days: number): string[] {
  const out: string[] = [];
  const base = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(base);
    d.setUTCDate(base.getUTCDate() - i);
    out.push(dayBucket(d));
  }
  return out;
}

function parseDays(event: APIGatewayProxyEventV2, fallback = 30, max = 90): number {
  const raw = Number(event.queryStringParameters?.days ?? fallback);
  if (!Number.isFinite(raw) || raw < 1) return fallback;
  return Math.min(Math.floor(raw), max);
}

async function getRollup(day: string): Promise<RollupItem[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: EVENTS_TABLE,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": eventKeys.rollupPk(day) },
    })
  );
  return (res.Items ?? []) as RollupItem[];
}

const FUNNEL_TYPES = [
  EVENT_TYPES.PAGE_VIEW,
  EVENT_TYPES.PRODUCT_VIEW,
  EVENT_TYPES.CART_ADD,
  EVENT_TYPES.CHECKOUT_START,
  EVENT_TYPES.PURCHASE,
] as const;

export async function getAnalyticsOverview(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  const days = parseDays(event);
  const dayList = rangeDays(days);

  const rollups = await Promise.all(dayList.map((d) => getRollup(d)));

  const totals: Record<string, number> = {};
  const trafficByDay: { day: string; pageViews: number; purchases: number }[] = [];

  dayList.forEach((day, idx) => {
    const items = rollups[idx];
    let pageViews = 0;
    let purchases = 0;
    for (const item of items) {
      if (item.kind === "type") {
        const count = Number(item.count ?? 0);
        totals[item.label as string] = (totals[item.label as string] ?? 0) + count;
        if (item.label === EVENT_TYPES.PAGE_VIEW) pageViews = count;
        if (item.label === EVENT_TYPES.PURCHASE) purchases = count;
      }
    }
    trafficByDay.push({ day, pageViews, purchases });
  });

  // chronological order (oldest first) for charts
  trafficByDay.reverse();

  const funnel = FUNNEL_TYPES.map((type) => ({ type, count: totals[type] ?? 0 }));
  const pageViews = totals[EVENT_TYPES.PAGE_VIEW] ?? 0;
  const purchases = totals[EVENT_TYPES.PURCHASE] ?? 0;
  const conversionRate = pageViews > 0 ? purchases / pageViews : 0;

  return ok({
    days,
    totals,
    funnel,
    trafficByDay,
    conversionRate,
  });
}

export async function getTopProducts(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  const days = parseDays(event);
  const rollups = await Promise.all(rangeDays(days).map((d) => getRollup(d)));

  const map = new Map<string, { slug: string; views: number; adds: number }>();
  for (const items of rollups) {
    for (const item of items) {
      if (item.kind !== "product") continue;
      const slug = item.label as string;
      const entry = map.get(slug) ?? { slug, views: 0, adds: 0 };
      entry.views += Number(item.views ?? 0);
      entry.adds += Number(item.adds ?? 0);
      map.set(slug, entry);
    }
  }

  const products = [...map.values()].sort((a, b) => b.views - a.views).slice(0, 25);
  return ok({ days, products });
}

export async function getTopSearches(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  const days = parseDays(event);
  const rollups = await Promise.all(rangeDays(days).map((d) => getRollup(d)));

  const map = new Map<string, { term: string; count: number; zero: number }>();
  for (const items of rollups) {
    for (const item of items) {
      if (item.kind !== "search") continue;
      const term = item.label as string;
      const entry = map.get(term) ?? { term, count: 0, zero: 0 };
      entry.count += Number(item.count ?? 0);
      entry.zero += Number(item.zero ?? 0);
      map.set(term, entry);
    }
  }

  const all = [...map.values()].sort((a, b) => b.count - a.count);
  const searches = all.slice(0, 25);
  const zeroResult = all.filter((s) => s.zero > 0).sort((a, b) => b.zero - a.zero).slice(0, 25);
  return ok({ days, searches, zeroResult });
}

interface SessionSummary {
  sessionId: string;
  firstSeen: string;
  lastSeen: string;
  eventCount: number;
  lastPath?: string;
  name?: string;
  email?: string;
  phone?: string;
  country?: string;
  city?: string;
  region?: string;
  regionName?: string;
  timezone?: string;
  locale?: string;
  referrer?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  purchased?: boolean;
  pages: string[];
  products: string[];
}

const SESSION_EVENT_TYPES = [
  EVENT_TYPES.PAGE_VIEW,
  EVENT_TYPES.PRODUCT_VIEW,
  EVENT_TYPES.CART_ADD,
  EVENT_TYPES.CHECKOUT_START,
  EVENT_TYPES.PURCHASE,
  EVENT_TYPES.SEARCH,
] as const;

function mergeSessionEvent(
  sessions: Map<string, SessionSummary>,
  raw: Record<string, unknown>,
  sessionId: string
) {
  const at = (raw.createdAt as string) ?? (raw.at as string) ?? now();
  const path = raw.path as string | undefined;
  const productSlug = raw.productSlug as string | undefined;
  const metadata = (raw.metadata as Record<string, string> | undefined) ?? {};
  const geo = viewerGeoFromMetadata(metadata);
  const eventType = (raw.type as string | undefined) ?? "";

  const existing = sessions.get(sessionId);
  if (!existing) {
    sessions.set(sessionId, {
      sessionId,
      firstSeen: at,
      lastSeen: at,
      eventCount: 1,
      lastPath: path,
      country: geo.country,
      city: geo.city,
      region: geo.region,
      regionName: geo.regionName,
      timezone: metadata.timezone,
      locale: metadata.locale,
      referrer: (raw.referrer as string | undefined) ?? undefined,
      deviceType: metadata.deviceType,
      browser: metadata.browser,
      os: metadata.os,
      purchased: eventType === EVENT_TYPES.PURCHASE,
      pages: path ? [path] : [],
      products: productSlug ? [productSlug] : [],
    });
    return;
  }

  existing.eventCount += 1;
  if (eventType === EVENT_TYPES.PURCHASE) existing.purchased = true;
  if (at > existing.lastSeen) {
    existing.lastSeen = at;
    existing.lastPath = path ?? existing.lastPath;
    if (geo.country) existing.country = geo.country;
    if (geo.city) existing.city = geo.city;
    if (geo.region) existing.region = geo.region;
    if (geo.regionName) existing.regionName = geo.regionName;
    if (metadata.timezone) existing.timezone = metadata.timezone;
    if (metadata.locale) existing.locale = metadata.locale;
  }
  if (at < existing.firstSeen) existing.firstSeen = at;
  if (!existing.referrer && raw.referrer) existing.referrer = raw.referrer as string;
  if (path && !existing.pages.includes(path)) existing.pages.push(path);
  if (productSlug && !existing.products.includes(productSlug)) existing.products.push(productSlug);
  if (!existing.country && geo.country) existing.country = geo.country;
  if (!existing.city && geo.city) existing.city = geo.city;
  if (!existing.region && geo.region) existing.region = geo.region;
  if (!existing.regionName && geo.regionName) existing.regionName = geo.regionName;
  if (!existing.timezone && metadata.timezone) existing.timezone = metadata.timezone;
  if (!existing.locale && metadata.locale) existing.locale = metadata.locale;
  if (!existing.deviceType && metadata.deviceType) existing.deviceType = metadata.deviceType;
  if (!existing.browser && metadata.browser) existing.browser = metadata.browser;
  if (!existing.os && metadata.os) existing.os = metadata.os;
}

export async function listSessions(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  const days = parseDays(event, 7, 14);

  const sessions = new Map<string, SessionSummary>();

  for (const day of rangeDays(days)) {
    for (const type of SESSION_EVENT_TYPES) {
      const res = await docClient.send(
        new QueryCommand({
          TableName: EVENTS_TABLE,
          IndexName: "GSI1",
          KeyConditionExpression: "GSI1PK = :pk",
          ExpressionAttributeValues: { ":pk": eventKeys.gsi1pk(type, day) },
          ScanIndexForward: false,
          Limit: 500,
        })
      );
      for (const raw of (res.Items ?? []) as Record<string, unknown>[]) {
        const sessionId = raw.sessionId as string;
        if (!sessionId) continue;
        mergeSessionEvent(sessions, raw, sessionId);
      }
    }
  }

  const list = [...sessions.values()].sort((a, b) => b.lastSeen.localeCompare(a.lastSeen)).slice(0, 100);

  // join identity (best effort, capped by the 100 above)
  await Promise.all(
    list.map(async (s) => {
      const res = await docClient.send(
        new GetCommand({
          TableName: CUSTOMERS_TABLE,
          Key: { PK: customerKeys.pk(s.sessionId), SK: customerKeys.profileSk() },
        })
      );
      if (res.Item) {
        s.name = res.Item.name as string | undefined;
        s.email = res.Item.email as string | undefined;
        s.phone = res.Item.phone as string | undefined;
      }
    })
  );

  return ok({ days, sessions: list });
}

export async function getSessionTimeline(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  const sessionId = event.pathParameters?.sessionId;
  if (!sessionId) return badRequest("Session id required");

  const eventsRes = await docClient.send(
    new QueryCommand({
      TableName: EVENTS_TABLE,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": eventKeys.pk(sessionId) },
      ScanIndexForward: true,
    })
  );

  const identityRes = await docClient.send(
    new QueryCommand({
      TableName: CUSTOMERS_TABLE,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": customerKeys.pk(sessionId) },
    })
  );

  const identityItems = (identityRes.Items ?? []) as Record<string, unknown>[];
  const profile = identityItems.find((i) => i.SK === customerKeys.profileSk());
  const leads = identityItems.filter((i) => String(i.SK).startsWith("LEAD#"));

  return ok({
    sessionId,
    profile: profile ?? null,
    leads,
    events: eventsRes.Items ?? [],
  });
}

function trafficSourceLabel(referrer?: string): string {
  if (!referrer) return "Direct";
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    if (host.includes("google")) return "Google";
    if (host.includes("facebook") || host.includes("fb.")) return "Facebook";
    if (host.includes("instagram")) return "Instagram";
    if (host.includes("bing")) return "Bing";
    if (host.includes("usarakhi")) return "Internal";
    return host;
  } catch {
    return referrer.slice(0, 40);
  }
}

async function collectSessions(days: number): Promise<Map<string, SessionSummary>> {
  const sessions = new Map<string, SessionSummary>();
  for (const day of rangeDays(days)) {
    for (const type of SESSION_EVENT_TYPES) {
      const res = await docClient.send(
        new QueryCommand({
          TableName: EVENTS_TABLE,
          IndexName: "GSI1",
          KeyConditionExpression: "GSI1PK = :pk",
          ExpressionAttributeValues: { ":pk": eventKeys.gsi1pk(type, day) },
          ScanIndexForward: false,
          Limit: 500,
        })
      );
      for (const raw of (res.Items ?? []) as Record<string, unknown>[]) {
        const sessionId = raw.sessionId as string;
        if (!sessionId) continue;
        mergeSessionEvent(sessions, raw, sessionId);
      }
    }
  }
  return sessions;
}

async function fetchPaidOrdersSince(isoFrom: string): Promise<Order[]> {
  const items: Order[] = [];
  let lastKey: Record<string, unknown> | undefined;
  do {
    const res = await docClient.send(
      new QueryCommand({
        TableName: ORDERS_TABLE,
        IndexName: "GSI2",
        KeyConditionExpression: "GSI2PK = :pk AND GSI2SK >= :from",
        ExpressionAttributeValues: {
          ":pk": orderKeys.gsi2pk(),
          ":from": isoFrom,
        },
        ExclusiveStartKey: lastKey,
        ScanIndexForward: false,
      })
    );
    items.push(...((res.Items ?? []) as Order[]));
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);
  return items;
}

export async function getAnalyticsInsights(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();
  const days = parseDays(event, 7, 90);
  const dayList = rangeDays(days);
  const fromIso = new Date();
  fromIso.setUTCDate(fromIso.getUTCDate() - days);
  const fromIsoStr = fromIso.toISOString();

  const [sessions, orders] = await Promise.all([
    collectSessions(days),
    fetchPaidOrdersSince(fromIsoStr),
  ]);

  const sessionList = [...sessions.values()];

  const byLocation = new Map<
    string,
    { location: string; orderCount: number; revenueUSD: number; revenueINR: number }
  >();
  for (const order of orders) {
    if (!isRevenueOrder(order.status) || order.status === ORDER_STATUS.PENDING_PAYMENT) continue;
    const paidAt = getOrderPaidAt(order);
    if (!paidAt || paidAt < fromIsoStr) continue;

    const state = order.shippingAddress?.state?.trim();
    const country = order.shippingAddress?.country?.trim() ?? "Unknown";
    const location = state ? `${state}, ${country}` : country;
    const entry = byLocation.get(location) ?? {
      location,
      orderCount: 0,
      revenueUSD: 0,
      revenueINR: 0,
    };
    entry.orderCount += 1;
    if (order.currency === "USD") entry.revenueUSD += order.total;
    else entry.revenueINR += order.total;
    byLocation.set(location, entry);
  }

  const byTraffic = new Map<
    string,
    { source: string; visitors: number; orders: number }
  >();
  const byDevice = new Map<string, number>();
  const byBrowser = new Map<string, number>();
  const byOs = new Map<string, number>();

  for (const s of sessionList) {
    const source = trafficSourceLabel(s.referrer);
    const t = byTraffic.get(source) ?? { source, visitors: 0, orders: 0 };
    t.visitors += 1;
    if (s.purchased) t.orders += 1;
    byTraffic.set(source, t);

    const device = s.deviceType ?? "Unknown";
    byDevice.set(device, (byDevice.get(device) ?? 0) + 1);
    const browser = s.browser ?? "Unknown";
    byBrowser.set(browser, (byBrowser.get(browser) ?? 0) + 1);
    const os = s.os ?? "Unknown";
    byOs.set(os, (byOs.get(os) ?? 0) + 1);
  }

  const rollups = await Promise.all(dayList.map((d) => getRollup(d)));
  const ordersByDay: { day: string; orders: number; pageViews: number }[] = [];
  dayList.forEach((day, idx) => {
    const items = rollups[idx];
    let pageViews = 0;
    let orders = 0;
    for (const item of items) {
      if (item.kind !== "type") continue;
      if (item.label === EVENT_TYPES.PAGE_VIEW) pageViews = Number(item.count ?? 0);
      if (item.label === EVENT_TYPES.PURCHASE) orders = Number(item.count ?? 0);
    }
    ordersByDay.push({ day, orders, pageViews });
  });
  ordersByDay.reverse();

  return ok({
    days,
    byLocation: [...byLocation.values()].sort((a, b) => b.orderCount - a.orderCount).slice(0, 25),
    byTrafficSource: [...byTraffic.values()]
      .map((t) => ({
        ...t,
        conversionRate: t.visitors > 0 ? t.orders / t.visitors : 0,
      }))
      .sort((a, b) => b.visitors - a.visitors)
      .slice(0, 20),
    byDevice: [...byDevice.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count),
    byBrowser: [...byBrowser.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count),
    byOs: [...byOs.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count),
    ordersByDay,
  });
}
