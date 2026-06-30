import { PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import {
  trackEventBatchSchema,
  eventKeys,
  EVENT_TYPES,
  EVENT_TTL_DAYS,
  mergeViewerGeo,
  parseViewerGeoFromHeaders,
  type TrackEventInput,
} from "@onlinesadar/shared";
import { docClient, EVENTS_TABLE, now, ttlInDays, dayBucket } from "../lib/db";
import { ok, badRequest } from "../lib/response";

/** Atomically increment one or more counters on a daily rollup item. */
async function incrementRollup(
  day: string,
  metric: string,
  kind: string,
  label: string,
  fields: Record<string, number>
) {
  const names: Record<string, string> = { "#kind": "kind", "#lbl": "label" };
  const values: Record<string, unknown> = { ":kind": kind, ":lbl": label, ":now": now() };
  const addParts: string[] = [];
  let i = 0;
  for (const [field, delta] of Object.entries(fields)) {
    const nameKey = `#f${i}`;
    const valKey = `:d${i}`;
    names[nameKey] = field;
    values[valKey] = delta;
    addParts.push(`${nameKey} ${valKey}`);
    i++;
  }

  await docClient.send(
    new UpdateCommand({
      TableName: EVENTS_TABLE,
      Key: { PK: eventKeys.rollupPk(day), SK: eventKeys.rollupSk(metric) },
      UpdateExpression:
        "SET #kind = if_not_exists(#kind, :kind), #lbl = if_not_exists(#lbl, :lbl), updatedAt = :now ADD " +
        addParts.join(", "),
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    })
  );
}

function viewerGeoFromRequest(event: APIGatewayProxyEventV2) {
  return parseViewerGeoFromHeaders(event.headers ?? {});
}

function geoMetadata(client: Record<string, string | undefined>, edge: ReturnType<typeof viewerGeoFromRequest>) {
  const merged = mergeViewerGeo(
    {
      country: client.country,
      city: client.city,
      region: client.region,
      regionName: client.regionName,
    },
    edge
  );
  const out: Record<string, string> = {};
  if (merged.country) out.country = merged.country;
  if (merged.city) out.city = merged.city;
  if (merged.region) out.region = merged.region;
  if (merged.regionName) out.regionName = merged.regionName;
  return out;
}

async function persistEvent(e: TrackEventInput, edgeGeo: ReturnType<typeof viewerGeoFromRequest>) {
  const timestamp = e.at ?? now();
  const day = dayBucket(new Date(timestamp));
  const eventId = uuidv4();
  const clientMeta = (e.metadata ?? {}) as Record<string, string | undefined>;
  const geoFields = geoMetadata(clientMeta, edgeGeo);
  const metadata = {
    ...e.metadata,
    ...geoFields,
  };

  await docClient.send(
    new PutCommand({
      TableName: EVENTS_TABLE,
      Item: {
        ...e,
        metadata: Object.keys(metadata).length ? metadata : undefined,
        eventId,
        createdAt: timestamp,
        PK: eventKeys.pk(e.sessionId),
        SK: eventKeys.sk(timestamp, eventId),
        GSI1PK: eventKeys.gsi1pk(e.type, day),
        GSI1SK: eventKeys.gsi1sk(timestamp),
        expiresAt: ttlInDays(EVENT_TTL_DAYS),
      },
    })
  );

  // per-type total (traffic + funnel)
  await incrementRollup(day, `TYPE#${e.type}`, "type", e.type, { count: 1 });

  if (e.type === EVENT_TYPES.PRODUCT_VIEW && e.productSlug) {
    await incrementRollup(day, `PRODUCT#${e.productSlug}`, "product", e.productSlug, { views: 1 });
  }
  if (e.type === EVENT_TYPES.CART_ADD && e.productSlug) {
    await incrementRollup(day, `PRODUCT#${e.productSlug}`, "product", e.productSlug, { adds: 1 });
  }
  if (e.type === EVENT_TYPES.SEARCH && e.query) {
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

export async function recordEvent(event: APIGatewayProxyEventV2) {
  if ((event.body?.length ?? 0) > MAX_BODY_BYTES) return badRequest("Payload too large");
  const body = JSON.parse(event.body ?? "{}");
  const payload = Array.isArray(body) ? { events: body } : body;
  const parsed = trackEventBatchSchema.safeParse(payload);
  if (!parsed.success) return badRequest(parsed.error.message);

  const edgeGeo = viewerGeoFromRequest(event);
  await Promise.all(parsed.data.events.map((e) => persistEvent(e, edgeGeo)));
  return ok({ recorded: parsed.data.events.length });
}
