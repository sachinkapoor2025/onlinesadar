"use client";

import dynamic from "next/dynamic";
import { ExitIntentPopup } from "@/components/ExitIntentPopup";

const ChatWidget = dynamic(() => import("@/components/ChatWidget").then((m) => m.ChatWidget), {
  ssr: false,
  loading: () => null,
});

/** Client-only widgets loaded after hydration (reduces initial JS). */
export function ClientDeferredWidgets() {
  return (
    <>
      <ChatWidget />
      <ExitIntentPopup />
    </>
  );
}
