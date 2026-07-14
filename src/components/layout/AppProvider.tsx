"use client";

import { AppProvider, Frame } from "@shopify/polaris";
import en from "@shopify/polaris/locales/en.json";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { authFetch } from "@/lib/authFetch";

// Reads straight from window.location rather than useSearchParams(), which
// goes stale in this embedded app — Shopify's App Bridge drives iframe
// navigation via the History API directly, and Next's router doesn't always
// resync its internal search-params state from that.
function readEmbedParams() {
  if (typeof window === "undefined") return { host: "", shop: "" };
  const params = new URLSearchParams(window.location.search);
  return { host: params.get("host") ?? "", shop: params.get("shop") ?? "" };
}

interface NavItem {
  label: string;
  href: string;
  match: (pathname: string) => boolean;
  tag?: string;
}

function Inner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [{ host, shop }, setEmbedParams] = useState(readEmbedParams);
  const [lowStockCount, setLowStockCount] = useState<number | null>(null);
  const [draftCount, setDraftCount] = useState<number | null>(null);

  useEffect(() => {
    setEmbedParams(readEmbedParams());
  }, [pathname]);

  useEffect(() => {
    Promise.all([
      authFetch("/api/products").then(r => (r.ok ? r.json() : [])),
      authFetch("/api/purchase-orders").then(r => (r.ok ? r.json() : [])),
    ]).then(([products, pos]) => {
      setLowStockCount(products.filter((p: any) => p.reorder_point != null && p.current_inventory <= p.reorder_point).length);
      setDraftCount(pos.filter((po: any) => po.status === "draft").length);
    });
  }, []);

  const qs = [host && `host=${host}`, shop && `shop=${shop}`].filter(Boolean).join("&");
  const q = qs ? `?${qs}` : "";

  const primaryItems: NavItem[] = [
    { label: "Dashboard", href: `/dashboard${q}`, match: (p) => p === "/dashboard" },
    {
      label: "Products", href: `/products${q}`, match: (p) => p === "/products",
      tag: lowStockCount != null && lowStockCount > 0 ? `${lowStockCount} low` : undefined,
    },
    { label: "Suppliers", href: `/suppliers${q}`, match: (p) => p === "/suppliers" },
    {
      label: "Purchase Orders", href: `/purchase-orders${q}`, match: (p) => p.startsWith("/purchase-orders"),
      tag: draftCount != null && draftCount > 0 ? `${draftCount} draft` : undefined,
    },
  ];

  const allClear = (lowStockCount ?? 0) === 0 && (draftCount ?? 0) === 0;

  const nav = (
    <div className="rp-sidebar">
      <div className="rp-sidebar__brand">
        <div className="rp-sidebar__store">Replenish</div>
        {lowStockCount != null && (
          <span className={`rp-sidebar__health rp-sidebar__health--${allClear ? "good" : "bad"}`}>
            {allClear ? "All Clear" : "Needs Action"}
          </span>
        )}
      </div>

      <nav className="rp-sidebar__nav" aria-label="Primary">
        <ul>
          {primaryItems.map((item) => {
            const active = item.match(pathname);
            return (
              <li key={item.href}>
                <Link href={item.href} aria-current={active ? "page" : undefined} className={`rp-navrow${active ? " rp-navrow--active" : ""}`}>
                  <span className="rp-navrow__label">{item.label}</span>
                  {item.tag && <span className="rp-navrow__tag">{item.tag}</span>}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="rp-sidebar__divider" />

        <ul>
          <li>
            <Link
              href={`/settings${q}`}
              aria-current={pathname === "/settings" ? "page" : undefined}
              className={`rp-navrow rp-navrow--secondary${pathname === "/settings" ? " rp-navrow--active" : ""}`}
            >
              <span className="rp-navrow__label">Billing</span>
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );

  return (
    <AppProvider i18n={en}>
      <Frame navigation={nav}>
        {children}
      </Frame>
    </AppProvider>
  );
}

export default function ShopifyAppProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AppProvider i18n={en}><Frame>{children}</Frame></AppProvider>}>
      <Inner>{children}</Inner>
    </Suspense>
  );
}
