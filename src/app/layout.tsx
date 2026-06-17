import type { Metadata } from "next";
import "@shopify/polaris/build/esm/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Replenish — Inventory & Purchase Orders",
  description: "Simple inventory forecasting and purchase order management for Shopify",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
