"use client";

import { useEffect, useState } from "react";

/**
 * Extracts the shop's *.myshopify.com domain from Shopify's base64 `host`
 * param (format: "<shop>.myshopify.com/admin"). `host` is always present on
 * embedded-app URLs, unlike `shop`, which Shopify's newer admin.shopify.com
 * embed doesn't reliably include.
 */
function shopFromHost(host: string): string {
  try {
    const decoded = window.atob(host);
    const domain = decoded.split("/")[0];
    return domain.endsWith(".myshopify.com") ? domain : "";
  } catch {
    return "";
  }
}

/**
 * Shopify's unified admin.shopify.com embed doesn't always put shop/host in
 * the iframe's URL at all on deep-linked navigation (confirmed: a fresh
 * embedded load can have an entirely bare URL) — it communicates context to
 * the app via App Bridge/postMessage instead, which this app doesn't fully
 * implement. But the iframe's document.referrer reliably contains the
 * parent admin page's URL (e.g. "https://admin.shopify.com/store/<handle>/
 * apps/<app>"), which has the store handle right in it.
 */
function shopFromReferrer(): string {
  if (typeof document === "undefined" || !document.referrer) return "";
  const match = document.referrer.match(/\/store\/([a-zA-Z0-9][a-zA-Z0-9-]*)\b/);
  return match ? `${match[1]}.myshopify.com` : "";
}

/**
 * Reads shop/host straight from the live browser URL rather than Next's
 * useSearchParams(), which goes stale in this embedded app: Shopify's App
 * Bridge drives the iframe's navigation via the History API directly, and
 * that doesn't always trigger Next's router to resync its internal search
 * params — window.location.search is always accurate regardless. Falls back
 * to document.referrer when the URL has no params at all.
 */
function parseShopFromLocation(): string {
  if (typeof window === "undefined") return "";

  const params = new URLSearchParams(window.location.search);
  const shopParam = params.get("shop");
  if (shopParam) return shopParam;

  const host = params.get("host");
  const fromHost = host ? shopFromHost(host) : "";
  if (fromHost) return fromHost;

  return shopFromReferrer();
}

export function useShop(): string {
  const [shop, setShop] = useState<string>(parseShopFromLocation);

  useEffect(() => {
    const resolved = parseShopFromLocation();
    setShop(resolved);

    if (!resolved) {
      console.warn("[replenish] could not resolve shop from window.location", window.location.href);
    }
  }, []);

  return shop;
}

/** Appends `?shop=` (or `&shop=`) to an API path using the current shop param. */
export function withShop(path: string, shop: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}shop=${encodeURIComponent(shop)}`;
}
