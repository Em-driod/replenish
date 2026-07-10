"use client";

import { useSearchParams } from "next/navigation";

/** Reads the `shop` query param Shopify appends to every embedded-app URL. */
export function useShop(): string {
  const params = useSearchParams();
  return params.get("shop") ?? "";
}

/** Appends `?shop=` (or `&shop=`) to an API path using the current shop param. */
export function withShop(path: string, shop: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}shop=${encodeURIComponent(shop)}`;
}
