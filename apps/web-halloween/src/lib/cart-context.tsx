"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { api } from "./api";
import { getOrCreateSessionId, useSessionId } from "./session";
import { useAuth } from "./auth-context";
import { trackCartAdd, trackCartRemove } from "./track";
import type { Cart } from "@hr-ecom/shared";

interface CartContextValue {
  cart: Cart | null;
  loading: boolean;
  sessionReady: boolean;
  refresh: () => Promise<void>;
  addItem: (productSlug: string, quantity?: number) => Promise<void>;
  updateItem: (productSlug: string, quantity: number) => Promise<void>;
  removeItem: (productSlug: string) => Promise<void>;
  itemCount: number;
}

const CartContext = createContext<CartContextValue | null>(null);

function normalizeCart(raw: Cart & { PK?: string; SK?: string }): Cart {
  return {
    items: raw.items ?? [],
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
  };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const sessionId = useSessionId();
  const { token } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionReady = Boolean(sessionId);

  const resolveSessionId = useCallback(() => sessionId || getOrCreateSessionId(), [sessionId]);

  const refresh = useCallback(async () => {
    const sid = resolveSessionId();
    if (!sid) return;
    setLoading(true);
    try {
      const data = await api<{ cart: Cart }>("/cart", { sessionId: sid, token });
      setCart(normalizeCart(data.cart));
    } catch {
      setCart({ items: [], updatedAt: new Date().toISOString() });
    } finally {
      setLoading(false);
    }
  }, [resolveSessionId, token]);

  useEffect(() => {
    if (sessionId) refresh();
  }, [sessionId, refresh]);

  const addItem = async (productSlug: string, quantity = 1) => {
    const sid = resolveSessionId();
    if (!sid) throw new Error("Session not ready — please try again");

    const data = await api<{ cart: Cart }>("/cart/items", {
      method: "POST",
      sessionId: sid,
      token,
      body: JSON.stringify({ productSlug, quantity }),
    });
    setCart(normalizeCart(data.cart));
    const added = data.cart.items.find((i) => i.productSlug === productSlug);
    trackCartAdd(productSlug, added ? added.price * added.quantity : undefined);
  };

  const removeItem = async (productSlug: string) => {
    const sid = resolveSessionId();
    if (!sid) return;

    const data = await api<{ cart: Cart }>(`/cart/items/${productSlug}`, {
      method: "DELETE",
      sessionId: sid,
      token,
    });
    setCart(normalizeCart(data.cart));
    trackCartRemove(productSlug);
  };

  const updateItem = async (productSlug: string, quantity: number) => {
    const sid = resolveSessionId();
    if (!sid) throw new Error("Session not ready — please try again");

    const data = await api<{ cart: Cart }>(`/cart/items/${productSlug}`, {
      method: "PUT",
      sessionId: sid,
      token,
      body: JSON.stringify({ quantity }),
    });
    setCart(normalizeCart(data.cart));
  };

  const itemCount = cart?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0;

  return (
    <CartContext.Provider value={{ cart, loading, sessionReady, refresh, addItem, updateItem, removeItem, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
