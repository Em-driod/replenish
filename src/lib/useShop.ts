"use client";

import { useSearchParams } from "next/navigation";

/**
 * Extracts the shop's *.myshopify.com domain from Shopify's base64 `host`
 * param (format: "<shop>.myshopify.com/admin"). `host` is always present on
 * embedded-app URLs, unlike `shop`, which Shopify's newer admin.shopify.com
 * embed doesn't reliably include.
 */
function shopFromHost(host: string): string {
  try {
    const decoded = typeof window !== "undefined" ? window.atob(host) : Buffer.from(host, "base64").toString("utf-8");
    const domain = decoded.split("/")[0];
    return domain.endsWith(".myshopify.com") ? domain : "";
  } catch {
    return "";
  }
}

/** Reads the current shop's *.myshopify.com domain from the embedded-app URL. */
export function useShop(): string {
  const params = useSearchParams();
  const shopParam = params.get("shop");
  if (shopParam) return shopParam;

  const host = params.get("host");
  return host ? shopFromHost(host) : "";
}

/** Appends `?shop=` (or `&shop=`) to an API path using the current shop param. */
export function withShop(path: string, shop: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}shop=${encodeURIComponent(shop)}`;
}
