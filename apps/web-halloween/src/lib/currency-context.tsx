"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_USD_INR_RATE,
  fetchLiveUsdInrRate,
  convertCurrency,
  normalizeDisplayCurrency,
  type DisplayCurrency,
} from "@hr-ecom/shared";
import { getApiUrl } from "./env";

export type { DisplayCurrency };

const STORAGE_KEY = "hr_ecom_currency";
const MANUAL_KEY = "hr_ecom_currency_manual";
const RATE_CACHE_KEY = "hr_ecom_usd_inr_rate";
const RATE_CACHE_AT_KEY = "hr_ecom_usd_inr_rate_at";
const RATE_CACHE_TTL_MS = 30 * 60 * 1000;
const ENV_FALLBACK = Number(process.env.NEXT_PUBLIC_USD_INR_RATE) || DEFAULT_USD_INR_RATE;

interface CurrencyContextValue {
  displayCurrency: DisplayCurrency;
  setDisplayCurrency: (c: DisplayCurrency) => void;
  usdInrRate: number;
  rateLoading: boolean;
  rateSource: string;
  convert: (amount: number, from: DisplayCurrency | string) => number;
  format: (amount: number, from: DisplayCurrency | string) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function readCachedRate(): number | null {
  if (typeof window === "undefined") return null;
  const cachedAt = sessionStorage.getItem(RATE_CACHE_AT_KEY);
  const cached = sessionStorage.getItem(RATE_CACHE_KEY);
  if (!cached || !cachedAt) return null;
  if (Date.now() - Number(cachedAt) > RATE_CACHE_TTL_MS) return null;
  const n = Number(cached);
  return n > 0 ? n : null;
}

function storeCachedRate(rate: number) {
  sessionStorage.setItem(RATE_CACHE_KEY, String(rate));
  sessionStorage.setItem(RATE_CACHE_AT_KEY, String(Date.now()));
}

async function fetchUsdInrRate(): Promise<{ rate: number; source: string }> {
  try {
    const res = await fetch(`${getApiUrl()}/config/usd-inr-rate`, { cache: "no-store" });
    if (!res.ok) throw new Error("api rate failed");
    const data = (await res.json()) as { rate?: number; source?: string };
    if (!data.rate || data.rate <= 0) throw new Error("invalid api rate");
    storeCachedRate(data.rate);
    return { rate: data.rate, source: data.source ?? "api" };
  } catch {
    /* fall through */
  }

  try {
    const live = await fetchLiveUsdInrRate();
    if (live) {
      storeCachedRate(live.rate);
      return { rate: live.rate, source: live.source };
    }
  } catch {
    /* fall through */
  }

  const cached = readCachedRate();
  if (cached) return { rate: cached, source: "session-cache" };

  return { rate: ENV_FALLBACK, source: "fallback" };
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [displayCurrency, setDisplayCurrencyState] = useState<DisplayCurrency>("USD");
  const [usdInrRate, setUsdInrRate] = useState(ENV_FALLBACK);
  const [rateSource, setRateSource] = useState("loading");
  const [rateLoading, setRateLoading] = useState(true);

  const refreshRate = useCallback(async () => {
    const { rate, source } = await fetchUsdInrRate();
    setUsdInrRate(rate);
    setRateSource(source);
    setRateLoading(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      const manual = localStorage.getItem(MANUAL_KEY) === "true";
      if (manual) {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === "USD" || saved === "INR") setDisplayCurrencyState(saved);
      } else {
        try {
          const res = await fetch("/api/geo", { cache: "no-store" });
          if (res.ok) {
            const data = (await res.json()) as { currency?: string };
            if (data.currency === "INR" || data.currency === "USD") {
              setDisplayCurrencyState(data.currency);
            }
          }
        } catch {
          setDisplayCurrencyState("USD");
        }
      }
    };

    void init();
    void refreshRate();

    const interval = setInterval(() => {
      void refreshRate();
    }, RATE_CACHE_TTL_MS);

    return () => clearInterval(interval);
  }, [refreshRate]);

  const setDisplayCurrency = useCallback((c: DisplayCurrency) => {
    setDisplayCurrencyState(c);
    localStorage.setItem(STORAGE_KEY, c);
    localStorage.setItem(MANUAL_KEY, "true");
  }, []);

  const convert = useCallback(
    (amount: number, from: DisplayCurrency | string) =>
      convertCurrency(
        amount,
        normalizeDisplayCurrency(typeof from === "string" ? from : from),
        displayCurrency,
        usdInrRate
      ),
    [displayCurrency, usdInrRate]
  );

  const format = useCallback(
    (amount: number, from: DisplayCurrency | string) => {
      const value = convert(amount, from);
      return new Intl.NumberFormat(displayCurrency === "INR" ? "en-IN" : "en-US", {
        style: "currency",
        currency: displayCurrency,
        maximumFractionDigits: displayCurrency === "INR" ? 0 : 2,
      }).format(value);
    },
    [convert, displayCurrency]
  );

  const value = useMemo(
    () => ({ displayCurrency, setDisplayCurrency, usdInrRate, rateLoading, rateSource, convert, format }),
    [displayCurrency, setDisplayCurrency, usdInrRate, rateLoading, rateSource, convert, format]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
