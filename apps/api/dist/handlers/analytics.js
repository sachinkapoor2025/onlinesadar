"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAnalyticsOverview = getAnalyticsOverview;
exports.getTopProducts = getTopProducts;
exports.getTopSearches = getTopSearches;
exports.listSessions = listSessions;
exports.getSessionTimeline = getSessionTimeline;
exports.getAnalyticsInsights = getAnalyticsInsights;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const shared_1 = require("@onlinesadar/shared");
const db_1 = require("../lib/db");
const response_1 = require("../lib/response");
const auth_1 = require("../lib/auth");
function rangeDays(days) {
    const out = [];
    const base = new Date();
    for (let i = 0; i < days; i++) {
        const d = new Date(base);
        d.setUTCDate(base.getUTCDate() - i);
        out.push((0, db_1.dayBucket)(d));
    }
    return out;
}
function parseDays(event, fallback = 30, max = 90) {
    const raw = Number(event.queryStringParameters?.days ?? fallback);
    if (!Number.isFinite(raw) || raw < 1)
        return fallback;
    return Math.min(Math.floor(raw), max);
}
async function getRollup(day) {
    const res = await db_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: db_1.EVENTS_TABLE,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: { ":pk": shared_1.eventKeys.rollupPk(day) },
    }));
    return (res.Items ?? []);
}
const FUNNEL_TYPES = [
    shared_1.EVENT_TYPES.PAGE_VIEW,
    shared_1.EVENT_TYPES.PRODUCT_VIEW,
    shared_1.EVENT_TYPES.CART_ADD,
    shared_1.EVENT_TYPES.CHECKOUT_START,
    shared_1.EVENT_TYPES.PURCHASE,
];
async function getAnalyticsOverview(event) {
    if (!(0, auth_1.requireAdmin)(event))
        return (0, response_1.forbidden)();
    const days = parseDays(event);
    const dayList = rangeDays(days);
    const rollups = await Promise.all(dayList.map((d) => getRollup(d)));
    const totals = {};
    const trafficByDay = [];
    dayList.forEach((day, idx) => {
        const items = rollups[idx];
        let pageViews = 0;
        let purchases = 0;
        for (const item of items) {
            if (item.kind === "type") {
                const count = Number(item.count ?? 0);
                totals[item.label] = (totals[item.label] ?? 0) + count;
                if (item.label === shared_1.EVENT_TYPES.PAGE_VIEW)
                    pageViews = count;
                if (item.label === shared_1.EVENT_TYPES.PURCHASE)
                    purchases = count;
            }
        }
        trafficByDay.push({ day, pageViews, purchases });
    });
    // chronological order (oldest first) for charts
    trafficByDay.reverse();
    const funnel = FUNNEL_TYPES.map((type) => ({ type, count: totals[type] ?? 0 }));
    const pageViews = totals[shared_1.EVENT_TYPES.PAGE_VIEW] ?? 0;
    const purchases = totals[shared_1.EVENT_TYPES.PURCHASE] ?? 0;
    const conversionRate = pageViews > 0 ? purchases / pageViews : 0;
    return (0, response_1.ok)({
        days,
        totals,
        funnel,
        trafficByDay,
        conversionRate,
    });
}
async function getTopProducts(event) {
    if (!(0, auth_1.requireAdmin)(event))
        return (0, response_1.forbidden)();
    const days = parseDays(event);
    const rollups = await Promise.all(rangeDays(days).map((d) => getRollup(d)));
    const map = new Map();
    for (const items of rollups) {
        for (const item of items) {
            if (item.kind !== "product")
                continue;
            const slug = item.label;
            const entry = map.get(slug) ?? { slug, views: 0, adds: 0 };
            entry.views += Number(item.views ?? 0);
            entry.adds += Number(item.adds ?? 0);
            map.set(slug, entry);
        }
    }
    const products = [...map.values()].sort((a, b) => b.views - a.views).slice(0, 25);
    return (0, response_1.ok)({ days, products });
}
async function getTopSearches(event) {
    if (!(0, auth_1.requireAdmin)(event))
        return (0, response_1.forbidden)();
    const days = parseDays(event);
    const rollups = await Promise.all(rangeDays(days).map((d) => getRollup(d)));
    const map = new Map();
    for (const items of rollups) {
        for (const item of items) {
            if (item.kind !== "search")
                continue;
            const term = item.label;
            const entry = map.get(term) ?? { term, count: 0, zero: 0 };
            entry.count += Number(item.count ?? 0);
            entry.zero += Number(item.zero ?? 0);
            map.set(term, entry);
        }
    }
    const all = [...map.values()].sort((a, b) => b.count - a.count);
    const searches = all.slice(0, 25);
    const zeroResult = all.filter((s) => s.zero > 0).sort((a, b) => b.zero - a.zero).slice(0, 25);
    return (0, response_1.ok)({ days, searches, zeroResult });
}
const SESSION_EVENT_TYPES = [
    shared_1.EVENT_TYPES.PAGE_VIEW,
    shared_1.EVENT_TYPES.PRODUCT_VIEW,
    shared_1.EVENT_TYPES.CART_ADD,
    shared_1.EVENT_TYPES.CHECKOUT_START,
    shared_1.EVENT_TYPES.PURCHASE,
    shared_1.EVENT_TYPES.SEARCH,
];
function mergeSessionEvent(sessions, raw, sessionId) {
    const at = raw.createdAt ?? raw.at ?? (0, db_1.now)();
    const path = raw.path;
    const productSlug = raw.productSlug;
    const metadata = raw.metadata ?? {};
    const geo = (0, shared_1.viewerGeoFromMetadata)(metadata);
    const eventType = raw.type ?? "";
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
            referrer: raw.referrer ?? undefined,
            deviceType: metadata.deviceType,
            browser: metadata.browser,
            os: metadata.os,
            purchased: eventType === shared_1.EVENT_TYPES.PURCHASE,
            pages: path ? [path] : [],
            products: productSlug ? [productSlug] : [],
        });
        return;
    }
    existing.eventCount += 1;
    if (eventType === shared_1.EVENT_TYPES.PURCHASE)
        existing.purchased = true;
    if (at > existing.lastSeen) {
        existing.lastSeen = at;
        existing.lastPath = path ?? existing.lastPath;
        if (geo.country)
            existing.country = geo.country;
        if (geo.city)
            existing.city = geo.city;
        if (geo.region)
            existing.region = geo.region;
        if (geo.regionName)
            existing.regionName = geo.regionName;
        if (metadata.timezone)
            existing.timezone = metadata.timezone;
        if (metadata.locale)
            existing.locale = metadata.locale;
    }
    if (at < existing.firstSeen)
        existing.firstSeen = at;
    if (!existing.referrer && raw.referrer)
        existing.referrer = raw.referrer;
    if (path && !existing.pages.includes(path))
        existing.pages.push(path);
    if (productSlug && !existing.products.includes(productSlug))
        existing.products.push(productSlug);
    if (!existing.country && geo.country)
        existing.country = geo.country;
    if (!existing.city && geo.city)
        existing.city = geo.city;
    if (!existing.region && geo.region)
        existing.region = geo.region;
    if (!existing.regionName && geo.regionName)
        existing.regionName = geo.regionName;
    if (!existing.timezone && metadata.timezone)
        existing.timezone = metadata.timezone;
    if (!existing.locale && metadata.locale)
        existing.locale = metadata.locale;
    if (!existing.deviceType && metadata.deviceType)
        existing.deviceType = metadata.deviceType;
    if (!existing.browser && metadata.browser)
        existing.browser = metadata.browser;
    if (!existing.os && metadata.os)
        existing.os = metadata.os;
}
async function listSessions(event) {
    if (!(0, auth_1.requireAdmin)(event))
        return (0, response_1.forbidden)();
    const days = parseDays(event, 7, 14);
    const sessions = new Map();
    for (const day of rangeDays(days)) {
        for (const type of SESSION_EVENT_TYPES) {
            const res = await db_1.docClient.send(new lib_dynamodb_1.QueryCommand({
                TableName: db_1.EVENTS_TABLE,
                IndexName: "GSI1",
                KeyConditionExpression: "GSI1PK = :pk",
                ExpressionAttributeValues: { ":pk": shared_1.eventKeys.gsi1pk(type, day) },
                ScanIndexForward: false,
                Limit: 500,
            }));
            for (const raw of (res.Items ?? [])) {
                const sessionId = raw.sessionId;
                if (!sessionId)
                    continue;
                mergeSessionEvent(sessions, raw, sessionId);
            }
        }
    }
    const list = [...sessions.values()].sort((a, b) => b.lastSeen.localeCompare(a.lastSeen)).slice(0, 100);
    // join identity (best effort, capped by the 100 above)
    await Promise.all(list.map(async (s) => {
        const res = await db_1.docClient.send(new lib_dynamodb_1.GetCommand({
            TableName: db_1.CUSTOMERS_TABLE,
            Key: { PK: shared_1.customerKeys.pk(s.sessionId), SK: shared_1.customerKeys.profileSk() },
        }));
        if (res.Item) {
            s.name = res.Item.name;
            s.email = res.Item.email;
            s.phone = res.Item.phone;
        }
    }));
    return (0, response_1.ok)({ days, sessions: list });
}
async function getSessionTimeline(event) {
    if (!(0, auth_1.requireAdmin)(event))
        return (0, response_1.forbidden)();
    const sessionId = event.pathParameters?.sessionId;
    if (!sessionId)
        return (0, response_1.badRequest)("Session id required");
    const eventsRes = await db_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: db_1.EVENTS_TABLE,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: { ":pk": shared_1.eventKeys.pk(sessionId) },
        ScanIndexForward: true,
    }));
    const identityRes = await db_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: db_1.CUSTOMERS_TABLE,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: { ":pk": shared_1.customerKeys.pk(sessionId) },
    }));
    const identityItems = (identityRes.Items ?? []);
    const profile = identityItems.find((i) => i.SK === shared_1.customerKeys.profileSk());
    const leads = identityItems.filter((i) => String(i.SK).startsWith("LEAD#"));
    return (0, response_1.ok)({
        sessionId,
        profile: profile ?? null,
        leads,
        events: eventsRes.Items ?? [],
    });
}
function trafficSourceLabel(referrer) {
    if (!referrer)
        return "Direct";
    try {
        const host = new URL(referrer).hostname.replace(/^www\./, "");
        if (host.includes("google"))
            return "Google";
        if (host.includes("facebook") || host.includes("fb."))
            return "Facebook";
        if (host.includes("instagram"))
            return "Instagram";
        if (host.includes("bing"))
            return "Bing";
        if (host.includes("usarakhi"))
            return "Internal";
        return host;
    }
    catch {
        return referrer.slice(0, 40);
    }
}
async function collectSessions(days) {
    const sessions = new Map();
    for (const day of rangeDays(days)) {
        for (const type of SESSION_EVENT_TYPES) {
            const res = await db_1.docClient.send(new lib_dynamodb_1.QueryCommand({
                TableName: db_1.EVENTS_TABLE,
                IndexName: "GSI1",
                KeyConditionExpression: "GSI1PK = :pk",
                ExpressionAttributeValues: { ":pk": shared_1.eventKeys.gsi1pk(type, day) },
                ScanIndexForward: false,
                Limit: 500,
            }));
            for (const raw of (res.Items ?? [])) {
                const sessionId = raw.sessionId;
                if (!sessionId)
                    continue;
                mergeSessionEvent(sessions, raw, sessionId);
            }
        }
    }
    return sessions;
}
async function fetchPaidOrdersSince(isoFrom) {
    const items = [];
    let lastKey;
    do {
        const res = await db_1.docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: db_1.ORDERS_TABLE,
            IndexName: "GSI2",
            KeyConditionExpression: "GSI2PK = :pk AND GSI2SK >= :from",
            ExpressionAttributeValues: {
                ":pk": shared_1.orderKeys.gsi2pk(),
                ":from": isoFrom,
            },
            ExclusiveStartKey: lastKey,
            ScanIndexForward: false,
        }));
        items.push(...(res.Items ?? []));
        lastKey = res.LastEvaluatedKey;
    } while (lastKey);
    return items;
}
async function getAnalyticsInsights(event) {
    if (!(0, auth_1.requireAdmin)(event))
        return (0, response_1.forbidden)();
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
    const byLocation = new Map();
    for (const order of orders) {
        if (!(0, shared_1.isRevenueOrder)(order.status) || order.status === shared_1.ORDER_STATUS.PENDING_PAYMENT)
            continue;
        const paidAt = (0, shared_1.getOrderPaidAt)(order);
        if (!paidAt || paidAt < fromIsoStr)
            continue;
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
        if (order.currency === "USD")
            entry.revenueUSD += order.total;
        else
            entry.revenueINR += order.total;
        byLocation.set(location, entry);
    }
    const byTraffic = new Map();
    const byDevice = new Map();
    const byBrowser = new Map();
    const byOs = new Map();
    for (const s of sessionList) {
        const source = trafficSourceLabel(s.referrer);
        const t = byTraffic.get(source) ?? { source, visitors: 0, orders: 0 };
        t.visitors += 1;
        if (s.purchased)
            t.orders += 1;
        byTraffic.set(source, t);
        const device = s.deviceType ?? "Unknown";
        byDevice.set(device, (byDevice.get(device) ?? 0) + 1);
        const browser = s.browser ?? "Unknown";
        byBrowser.set(browser, (byBrowser.get(browser) ?? 0) + 1);
        const os = s.os ?? "Unknown";
        byOs.set(os, (byOs.get(os) ?? 0) + 1);
    }
    const rollups = await Promise.all(dayList.map((d) => getRollup(d)));
    const ordersByDay = [];
    dayList.forEach((day, idx) => {
        const items = rollups[idx];
        let pageViews = 0;
        let orders = 0;
        for (const item of items) {
            if (item.kind !== "type")
                continue;
            if (item.label === shared_1.EVENT_TYPES.PAGE_VIEW)
                pageViews = Number(item.count ?? 0);
            if (item.label === shared_1.EVENT_TYPES.PURCHASE)
                orders = Number(item.count ?? 0);
        }
        ordersByDay.push({ day, orders, pageViews });
    });
    ordersByDay.reverse();
    return (0, response_1.ok)({
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
