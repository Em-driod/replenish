import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Shopify embedded apps load inside an iframe — must allow framing from Shopify admin
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "frame-ancestors https://*.myshopify.com https://admin.shopify.com",
            ].join("; "),
          },
        ],
      },
    ];
  },
  // Transpile Shopify packages that ship as ESM
  transpilePackages: ["@shopify/polaris", "@shopify/app-bridge-react"],
};

export default nextConfig;
