import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { shippingQuoteInputSchema, calculateShippingQuote } from "@onlinesadar/shared";
import { ok, badRequest } from "../lib/response";

export async function getShippingQuote(event: APIGatewayProxyEventV2) {
  const body = JSON.parse(event.body ?? "{}");
  const parsed = shippingQuoteInputSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const quote = calculateShippingQuote(parsed.data);
  return ok({ quote });
}
