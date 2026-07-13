import type { Metadata } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";
import "@shopify/polaris/build/esm/styles.css";
import "./globals.css";

const brandFont = Manrope({
  subsets: ["latin"],
  variable: "--font-brand",
  display: "swap",
});

const ledgerFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-ledger",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Replenish — Inventory & Purchase Orders",
  description: "Simple inventory forecasting and purchase order management for Shopify",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${brandFont.variable} ${ledgerFont.variable}`}>
      <head>
        {/* App Bridge: establishes the embedded session-token handshake with
            Shopify's admin shell — the platform-guaranteed way to identify
            the calling shop, since the iframe URL/referrer don't reliably
            carry it in Shopify's unified admin.shopify.com embed. */}
        <script
          src="https://cdn.shopify.com/shopifycloud/app-bridge.js"
          data-api-key={process.env.NEXT_PUBLIC_SHOPIFY_API_KEY}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
