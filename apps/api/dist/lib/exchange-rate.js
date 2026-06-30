"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_USD_INR_RATE = void 0;
exports.getLiveUsdInrRate = getLiveUsdInrRate;
exports.resolveCheckoutUsdInrRate = resolveCheckoutUsdInrRate;
const shared_1 = require("@onlinesadar/shared");
Object.defineProperty(exports, "DEFAULT_USD_INR_RATE", { enumerable: true, get: function () { return shared_1.DEFAULT_USD_INR_RATE; } });
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
let cache = null;
/** Live USD→INR with in-memory cache (Lambda container reuse). */
async function getLiveUsdInrRate() {
    const now = Date.now();
    if (cache && now < cache.expiresAt) {
        return { rate: cache.rate, source: cache.source, asOf: cache.asOf };
    }
    const envFallback = (0, shared_1.resolveUsdInrRate)(process.env.USD_INR_RATE ?? process.env.NEXT_PUBLIC_USD_INR_RATE);
    const live = await (0, shared_1.fetchLiveUsdInrRate)();
    const quote = live ?? {
        rate: envFallback,
        source: "env-fallback",
        asOf: new Date().toISOString(),
    };
    cache = { ...quote, expiresAt: now + CACHE_TTL_MS };
    return quote;
}
/** Pick checkout rate: prefer live server quote; client rate only if within 3% (display sync). */
async function resolveCheckoutUsdInrRate(clientRate) {
    const quote = await getLiveUsdInrRate();
    if (clientRate && clientRate > 0) {
        const drift = Math.abs(clientRate - quote.rate) / quote.rate;
        if (drift <= 0.03)
            return clientRate;
    }
    return quote.rate;
}
