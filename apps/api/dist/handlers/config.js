"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUsdInrRate = getUsdInrRate;
exports.getPaymentConfig = getPaymentConfig;
exports.updatePaymentConfig = updatePaymentConfig;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const shared_1 = require("@onlinesadar/shared");
const db_1 = require("../lib/db");
const response_1 = require("../lib/response");
const auth_1 = require("../lib/auth");
const exchange_rate_1 = require("../lib/exchange-rate");
async function getUsdInrRate(_event) {
    const quote = await (0, exchange_rate_1.getLiveUsdInrRate)();
    return (0, response_1.ok)(quote);
}
async function getPaymentConfig(_event) {
    const result = await db_1.docClient.send(new lib_dynamodb_1.GetCommand({
        TableName: db_1.CONFIG_TABLE,
        Key: { PK: shared_1.configKeys.payments.pk, SK: shared_1.configKeys.payments.sk },
    }));
    const config = result.Item ?? shared_1.defaultPaymentConfig;
    return (0, response_1.ok)({ config });
}
async function updatePaymentConfig(event) {
    const auth = (0, auth_1.getAuth)(event);
    if (!auth?.isAdmin)
        return (0, response_1.forbidden)();
    const body = JSON.parse(event.body ?? "{}");
    const parsed = shared_1.paymentConfigSchema.safeParse(body);
    if (!parsed.success)
        return (0, response_1.badRequest)(parsed.error.message);
    await db_1.docClient.send(new lib_dynamodb_1.PutCommand({
        TableName: db_1.CONFIG_TABLE,
        Item: {
            PK: shared_1.configKeys.payments.pk,
            SK: shared_1.configKeys.payments.sk,
            ...parsed.data,
            updatedAt: (0, db_1.now)(),
        },
    }));
    return (0, response_1.ok)({ config: parsed.data });
}
