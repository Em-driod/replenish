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
      <body>{children}</body>
    </html>
  );
}
