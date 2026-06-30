"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getShippingQuote = getShippingQuote;
const shared_1 = require("@onlinesadar/shared");
const response_1 = require("../lib/response");
async function getShippingQuote(event) {
    const body = JSON.parse(event.body ?? "{}");
    const parsed = shared_1.shippingQuoteInputSchema.safeParse(body);
    if (!parsed.success)
        return (0, response_1.badRequest)(parsed.error.message);
    const quote = (0, shared_1.calculateShippingQuote)(parsed.data);
    return (0, response_1.ok)({ quote });
}
