import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { configKeys, defaultPaymentConfig, paymentConfigSchema } from "@onlinesadar/shared";
import { docClient, CONFIG_TABLE, now } from "../lib/db";
import { ok, badRequest, forbidden } from "../lib/response";
import { getAuth } from "../lib/auth";
import { getLiveUsdInrRate } from "../lib/exchange-rate";

export async function getUsdInrRate(_event: APIGatewayProxyEventV2) {
  const quote = await getLiveUsdInrRate();
  return ok(quote);
}

export async function getPaymentConfig(_event: APIGatewayProxyEventV2) {
  const result = await docClient.send(
    new GetCommand({
      TableName: CONFIG_TABLE,
      Key: { PK: configKeys.payments.pk, SK: configKeys.payments.sk },
    })
  );

  const config = result.Item ?? defaultPaymentConfig;
  return ok({ config });
}

export async function updatePaymentConfig(event: APIGatewayProxyEventV2) {
  const auth = getAuth(event);
  if (!auth?.isAdmin) return forbidden();

  const body = JSON.parse(event.body ?? "{}");
  const parsed = paymentConfigSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  await docClient.send(
    new PutCommand({
      TableName: CONFIG_TABLE,
      Item: {
        PK: configKeys.payments.pk,
        SK: configKeys.payments.sk,
        ...parsed.data,
        updatedAt: now(),
      },
    })
  );

  return ok({ config: parsed.data });
}
