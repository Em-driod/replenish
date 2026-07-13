"use client";

import { AppProvider, Frame, Navigation } from "@shopify/polaris";
import en from "@shopify/polaris/locales/en.json";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  HomeIcon,
  ProductIcon,
  PersonIcon,
  OrderIcon,
  CreditCardIcon,
} from "@shopify/polaris-icons";

// Reads straight from window.location rather than useSearchParams(), which
// goes stale in this embedded app — Shopify's App Bridge drives iframe
// navigation via the History API directly, and Next's router doesn't always
// resync its internal search-params state from that.
function readEmbedParams() {
  if (typeof window === "undefined") return { host: "", shop: "" };
  const params = new URLSearchParams(window.location.search);
  return { host: params.get("host") ?? "", shop: params.get("shop") ?? "" };
}

function Inner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [{ host, shop }, setEmbedParams] = useState(readEmbedParams);

  useEffect(() => {
    setEmbedParams(readEmbedParams());
  }, [pathname]);

  const qs = [host && `host=${host}`, shop && `shop=${shop}`].filter(Boolean).join("&");
  const q = qs ? `?${qs}` : "";

  const nav = (
    <div className="rp-sidebar">
      <div className="rp-sidebar__brand">
        <span className="rp-sidebar__mark">R</span>
        <span className="rp-sidebar__brand-name">Replenish</span>
      </div>
      <Navigation location={pathname}>
        <Navigation.Section
          items={[
            { label: "Dashboard", icon: HomeIcon, url: `/dashboard${q}`, selected: pathname === "/dashboard" },
            { label: "Products", icon: ProductIcon, url: `/products${q}`, selected: pathname === "/products" },
            { label: "Suppliers", icon: PersonIcon, url: `/suppliers${q}`, selected: pathname === "/suppliers" },
            { label: "Purchase Orders", icon: OrderIcon, url: `/purchase-orders${q}`, selected: pathname.startsWith("/purchase-orders") },
            { label: "Billing", icon: CreditCardIcon, url: `/settings${q}`, selected: pathname === "/settings" },
          ]}
        />
      </Navigation>
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
