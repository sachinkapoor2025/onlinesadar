"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const FESTIVAL_DATE = new Date("2026-08-28T00:00:00");
/** Order-by date for guaranteed pre-festival delivery */
const ORDER_DEADLINE = new Date("2026-08-20T23:59:59");

function daysUntil(target: Date): number {
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

type Variant = "banner" | "inline";

export function RakshaBandhanCountdown({ variant = "banner" }: { variant?: Variant }) {
  const [daysToFestival, setDaysToFestival] = useState<number | null>(null);
  const [daysToOrder, setDaysToOrder] = useState<number | null>(null);

  useEffect(() => {
    setDaysToFestival(daysUntil(FESTIVAL_DATE));
    setDaysToOrder(daysUntil(ORDER_DEADLINE));
  }, []);

  if (daysToFestival === null) return null;
  if (daysToFestival === 0 && daysToOrder === 0) return null;

  if (variant === "inline") {
    return (
      <p className="text-sm text-slate-700">
        <span className="font-semibold text-primary">Raksha Bandhan 2026:</span> August 28
        {daysToFestival > 0 && (
          <>
            {" "}
            · <span className="font-semibold text-accent">{daysToFestival} days left</span>
          </>
        )}
        {daysToOrder !== null && daysToOrder > 0 && daysToOrder <= 14 && (
          <span className="block text-xs text-orange-700 mt-0.5">
            Order within {daysToOrder} days for guaranteed pre-festival USA delivery
          </span>
        )}
      </p>
    );
  }

  return (
    <div className="bg-gradient-to-r from-primary to-nav text-white text-center px-4 py-2.5 text-sm">
      <p>
        <span className="font-bold">Raksha Bandhan 2026</span> — August 28
        {daysToFestival > 0 && (
          <>
            {" "}
            · <span className="font-semibold">{daysToFestival} days to go</span>
          </>
        )}
        {daysToOrder !== null && daysToOrder > 0 && daysToOrder <= 21 && (
          <>
            {" "}
            · Order by Aug 20 for guaranteed delivery
          </>
        )}
        {" · "}
        <Link href="/raksha-bandhan" className="underline underline-offset-2 hover:text-white/90">
          Gift guide
        </Link>
      </p>
    </div>
  );
}
