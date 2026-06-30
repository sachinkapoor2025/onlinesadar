"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const HALLOWEEN_DATE = new Date("2026-10-31T00:00:00");
const ORDER_DEADLINE = new Date("2026-10-20T23:59:59");

function daysUntil(target: Date): number {
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

type Variant = "banner" | "inline";

export function HalloweenCountdown({ variant = "banner" }: { variant?: Variant }) {
  const [daysToHalloween, setDaysToHalloween] = useState<number | null>(null);
  const [daysToOrder, setDaysToOrder] = useState<number | null>(null);

  useEffect(() => {
    setDaysToHalloween(daysUntil(HALLOWEEN_DATE));
    setDaysToOrder(daysUntil(ORDER_DEADLINE));
  }, []);

  if (daysToHalloween === null) return null;
  if (daysToHalloween === 0 && daysToOrder === 0) return null;

  if (variant === "inline") {
    return (
      <p className="text-sm text-slate-700">
        <span className="font-semibold text-primary">Halloween 2026:</span> October 31
        {daysToHalloween > 0 && (
          <>
            {" "}
            · <span className="font-semibold text-nav">{daysToHalloween} days left</span>
          </>
        )}
        {daysToOrder !== null && daysToOrder > 0 && daysToOrder <= 14 && (
          <span className="block text-xs text-orange-700 mt-0.5">
            Order within {daysToOrder} days for guaranteed delivery before Halloween night
          </span>
        )}
      </p>
    );
  }

  return (
    <div className="bg-gradient-to-r from-primary via-purple-900 to-primary text-white text-center px-4 py-2.5 text-sm">
      <p>
        <span className="font-bold">Halloween 2026</span> — October 31
        {daysToHalloween > 0 && (
          <>
            {" "}
            · <span className="font-semibold text-nav">{daysToHalloween} days to go</span>
          </>
        )}
        {daysToOrder !== null && daysToOrder > 0 && daysToOrder <= 21 && (
          <> · Order by Oct 20 for guaranteed delivery</>
        )}
        {" · "}
        <Link href="/halloween-guide" className="underline underline-offset-2 hover:text-white/90">
          Shop the guide
        </Link>
      </p>
    </div>
  );
}

/** @deprecated Use HalloweenCountdown */
export const RakshaBandhanCountdown = HalloweenCountdown;
