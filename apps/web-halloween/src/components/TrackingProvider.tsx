"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { flushEvents, trackPageView, ensureVisitorGeo } from "@/lib/track";

/** Emits a page_view on every route change and flushes the event queue on unload. */
export function TrackingProvider() {
  const pathname = usePathname();

  useEffect(() => {
    void ensureVisitorGeo().then(() => trackPageView());
  }, [pathname]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushEvents();
    };
    const onPageHide = () => flushEvents();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, []);

  return null;
}
