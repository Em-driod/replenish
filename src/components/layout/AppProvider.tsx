"use client";

import { AppProvider, Frame, Navigation } from "@shopify/polaris";
import en from "@shopify/polaris/locales/en.json";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  HomeIcon,
  ProductIcon,
  PersonIcon,
  OrderIcon,
} from "@shopify/polaris-icons";

function Inner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const host = params.get("host") ?? "";
  const shop = params.get("shop") ?? "";
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
