"use client";

// Shared Sales Kit store.
//
// The Sales Kit used to live as component-local state on a single product
// detail page, so moving to another product wiped it. Sellers asked to build
// one kit out of items from several products, so the kit now persists in
// localStorage and every item carries the product it came from. That lets the
// panel and the exports group items by product while surviving navigation.

import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "apotheke.salesKit.v2";
// Same-tab consumers (e.g. the floating panel and the add buttons) sync via
// this custom event; other tabs sync via the native "storage" event.
const CHANGE_EVENT = "apotheke-sales-kit-change";

export type SalesKitItemType =
  | "claim"
  | "reference"
  | "gallery"
  | "social"
  | "materials"
  | "whybuy";

export type SalesKitItem = {
  /** Globally unique across products: `${productId}::${localId}`. */
  id: string;
  /** Per-product id such as "claim" or "gallery-images". */
  localId: string;
  type: SalesKitItemType;
  label: string;
  content: string;
  productId: string;
  productName: string;
  productExternalId: string | null;
  productPrice: number | null;
};

/** The payload callers provide; the global `id` is derived from it. */
export type SalesKitItemInput = Omit<SalesKitItem, "id">;

export type SalesKitProductGroup = {
  productId: string;
  productName: string;
  productExternalId: string | null;
  productPrice: number | null;
  items: SalesKitItem[];
};

function globalId(productId: string, localId: string): string {
  return `${productId}::${localId}`;
}

function isValidItem(value: unknown): value is SalesKitItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.localId === "string" &&
    typeof item.type === "string" &&
    typeof item.label === "string" &&
    typeof item.content === "string" &&
    typeof item.productId === "string" &&
    typeof item.productName === "string"
  );
}

function readStore(): SalesKitItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidItem);
  } catch {
    return [];
  }
}

function writeStore(items: SalesKitItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage can be unavailable (private mode, quota); the in-memory state
    // still updates so the current session keeps working.
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

/** Groups items by product, preserving first-seen order of products and items. */
export function groupSalesKitItems(items: SalesKitItem[]): SalesKitProductGroup[] {
  const groups: SalesKitProductGroup[] = [];
  const byProduct = new Map<string, SalesKitProductGroup>();
  for (const item of items) {
    let group = byProduct.get(item.productId);
    if (!group) {
      group = {
        productId: item.productId,
        productName: item.productName,
        productExternalId: item.productExternalId ?? null,
        productPrice: item.productPrice ?? null,
        items: [],
      };
      byProduct.set(item.productId, group);
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}

export function useSalesKit() {
  const [items, setItems] = useState<SalesKitItem[]>([]);

  // Hydrate from storage after mount to avoid SSR/client markup mismatch.
  useEffect(() => {
    setItems(readStore());
    const sync = () => setItems(readStore());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const addItem = useCallback((input: SalesKitItemInput) => {
    const id = globalId(input.productId, input.localId);
    const next = [...readStore()];
    if (next.some((i) => i.id === id)) return;
    next.push({ ...input, id });
    writeStore(next);
    setItems(next);
  }, []);

  const removeItem = useCallback((id: string) => {
    const next = readStore().filter((i) => i.id !== id);
    writeStore(next);
    setItems(next);
  }, []);

  const removeProduct = useCallback((productId: string) => {
    const next = readStore().filter((i) => i.productId !== productId);
    writeStore(next);
    setItems(next);
  }, []);

  const clear = useCallback(() => {
    writeStore([]);
    setItems([]);
  }, []);

  const isInKit = useCallback(
    (productId: string, localId: string) =>
      items.some((i) => i.id === globalId(productId, localId)),
    [items]
  );

  const groups = useMemo(() => groupSalesKitItems(items), [items]);

  return {
    items,
    groups,
    productCount: groups.length,
    addItem,
    removeItem,
    removeProduct,
    clear,
    isInKit,
  };
}
