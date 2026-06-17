import "@shopify/shopify-api/adapters/node";
import { shopifyApi, ApiVersion, Session } from "@shopify/shopify-api";

if (!process.env.SHOPIFY_API_KEY) throw new Error("SHOPIFY_API_KEY is required");
if (!process.env.SHOPIFY_API_SECRET) throw new Error("SHOPIFY_API_SECRET is required");
if (!process.env.SHOPIFY_APP_URL) throw new Error("SHOPIFY_APP_URL is required");

export const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: (process.env.SHOPIFY_SCOPES || "").split(","),
  hostName: process.env.SHOPIFY_APP_URL.replace(/^https?:\/\//, ""),
  apiVersion: ApiVersion.January25,
  isEmbeddedApp: true,
  future: {
    customerAddressDefaultFixEnabled: false,
    lineItemBillingCycleFixEnabled: false,
  },
});

export type { Session };
