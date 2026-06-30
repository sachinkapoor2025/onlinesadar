import {
  DEFAULT_USD_INR_RATE,
  fetchLiveUsdInrRate,
  resolveUsdInrRate,
  type ExchangeRateQuote,
} from "@onlinesadar/shared";

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

let cache: (ExchangeRateQuote & { expiresAt: number }) | null = null;

/** Live USD→INR with in-memory cache (Lambda container reuse). */
export async function getLiveUsdInrRate(): Promise<ExchangeRateQuote> {
  const now = Date.now();
  if (cache && now < cache.expiresAt) {
    return { rate: cache.rate, source: cache.source, asOf: cache.asOf };
  }

  const envFallback = resolveUsdInrRate(process.env.USD_INR_RATE ?? process.env.NEXT_PUBLIC_USD_INR_RATE);
  const live = await fetchLiveUsdInrRate();

  const quote: ExchangeRateQuote = live ?? {
    rate: envFallback,
    source: "env-fallback",
    asOf: new Date().toISOString(),
  };

  cache = { ...quote, expiresAt: now + CACHE_TTL_MS };
  return quote;
}

/** Pick checkout rate: prefer live server quote; client rate only if within 3% (display sync). */
export async function resolveCheckoutUsdInrRate(clientRate?: number): Promise<number> {
  const quote = await getLiveUsdInrRate();
  if (clientRate && clientRate > 0) {
    const drift = Math.abs(clientRate - quote.rate) / quote.rate;
    if (drift <= 0.03) return clientRate;
  }
  return quote.rate;
}

export { DEFAULT_USD_INR_RATE };
