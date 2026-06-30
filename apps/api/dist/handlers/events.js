"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordEvent = recordEvent;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
const shared_1 = require("@onlinesadar/shared");
const db_1 = require("../lib/db");
const response_1 = require("../lib/response");
/** Atomically increment one or more counters on a daily rollup item. */
async function incrementRollup(day, metric, kind, label, fields) {
    const names = { "#kind": "kind", "#lbl": "label" };
    const values = { ":kind": kind, ":lbl": label, ":now": (0, db_1.now)() };
    const addParts = [];
    let i = 0;
    for (const [field, delta] of Object.entries(fields)) {
        const nameKey = `#f${i}`;
        const valKey = `:d${i}`;
        names[nameKey] = field;
        values[valKey] = delta;
        addParts.push(`${nameKey} ${valKey}`);
        i++;
    }
    await db_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
        TableName: db_1.EVENTS_TABLE,
        Key: { PK: shared_1.eventKeys.rollupPk(day), SK: shared_1.eventKeys.rollupSk(metric) },
        UpdateExpression: "SET #kind = if_not_exists(#kind, :kind), #lbl = if_not_exists(#lbl, :lbl), updatedAt = :now ADD " +
            addParts.join(", "),
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
    }));
}
function viewerGeoFromRequest(event) {
    return (0, shared_1.parseViewerGeoFromHeaders)(event.headers ?? {});
}
function geoMetadata(client, edge) {
    const merged = (0, shared_1.mergeViewerGeo)({
        country: client.country,
        city: client.city,
        region: client.region,
        regionName: client.regionName,
    }, edge);
    const out = {};
    if (merged.country)
        out.country = merged.country;
    if (merged.city)
        out.city = merged.city;
    if (merged.region)
        out.region = merged.region;
    if (merged.regionName)
        out.regionName = merged.regionName;
    return out;
}
async function persistEvent(e, edgeGeo) {
    const timestamp = e.at ?? (0, db_1.now)();
    const day = (0, db_1.dayBucket)(new Date(timestamp));
    const eventId = (0, uuid_1.v4)();
    const clientMeta = (e.metadata ?? {});
    const geoFields = geoMetadata(clientMeta, edgeGeo);
    const metadata = {
        ...e.metadata,
        ...geoFields,
    };
    await db_1.docClient.send(new lib_dynamodb_1.PutCommand({
        TableName: db_1.EVENTS_TABLE,
        Item: {
            ...e,
            metadata: Object.keys(metadata).length ? metadata : undefined,
            eventId,
            createdAt: timestamp,
            PK: shared_1.eventKeys.pk(e.sessionId),
            SK: shared_1.eventKeys.sk(timestamp, eventId),
            GSI1PK: shared_1.eventKeys.gsi1pk(e.type, day),
            GSI1SK: shared_1.eventKeys.gsi1sk(timestamp),
            expiresAt: (0, db_1.ttlInDays)(shared_1.EVENT_TTL_DAYS),
        },
    }));
    // per-type total (traffic + funnel)
    await incrementRollup(day, `TYPE#${e.type}`, "type", e.type, { count: 1 });
    if (e.type === shared_1.EVENT_TYPES.PRODUCT_VIEW && e.productSlug) {
        await incrementRollup(day, `PRODUCT#${e.productSlug}`, "product", e.productSlug, { views: 1 });
    }
    if (e.type === shared_1.EVENT_TYPES.CART_ADD && e.productSlug) {
        await incrementRollup(day, `PRODUCT#${e.productSlug}`, "product", e.productSlug, { adds: 1 });
    }
    if (e.type === shared_1.EVENT_TYPES.SEARCH && e.query) {
        const term = e.query.trim().toLowerCase().slice(0, 80);
        if (term) {
            await incrementRollup(day, `SEARCH#${term}`, "search", term, {
                count: 1,
                ...(e.resultCount === 0 ? { zero: 1 } : {}),
            });
        }
    }
}
/** Reject oversized public payloads before parsing (abuse / cost guard). */
const MAX_BODY_BYTES = 64 * 1024;
async function recordEvent(event) {
    if ((event.body?.length ?? 0) > MAX_BODY_BYTES)
        return (0, response_1.badRequest)("Payload too large");
    const body = JSON.parse(event.body ?? "{}");
    const payload = Array.isArray(body) ? { events: body } : body;
    const parsed = shared_1.trackEventBatchSchema.safeParse(payload);
    if (!parsed.success)
        return (0, response_1.badRequest)(parsed.error.message);
    const edgeGeo = viewerGeoFromRequest(event);
    await Promise.all(parsed.data.events.map((e) => persistEvent(e, edgeGeo)));
    return (0, response_1.ok)({ recorded: parsed.data.events.length });
}
