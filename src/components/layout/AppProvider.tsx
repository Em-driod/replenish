"use client";

import { AppProvider } from "@shopify/polaris";
import { NavMenu } from "@shopify/app-bridge-react";
import en from "@shopify/polaris/locales/en.json";

interface Props {
  children: React.ReactNode;
  shop?: string;
}

export default function ShopifyAppProvider({ children, shop }: Props) {
  return (
    <AppProvider i18n={en}>
      <NavMenu>
        <a href="/dashboard" rel="home">Dashboard</a>
        <a href="/products">Products</a>
        <a href="/suppliers">Suppliers</a>
        <a href="/purchase-orders">Purchase Orders</a>
        <a href="/settings">Settings</a>
      </NavMenu>
      {children}
    </AppProvider>
  );
}
