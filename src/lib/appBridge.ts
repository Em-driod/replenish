"use client";

declare global {
  interface Window {
    shopify?: {
      idToken: () => Promise<string>;
    };
  }
}

/** Waits for the App Bridge CDN script (loaded in the root layout) to attach window.shopify. */
function waitForAppBridge(timeoutMs = 5000): Promise<Window["shopify"] | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(null);
    if (window.shopify) return resolve(window.shopify);

    const start = Date.now();
    const interval = setInterval(() => {
      if (window.shopify) {
        clearInterval(interval);
        resolve(window.shopify);
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        resolve(null);
      }
    }, 100);
  });
}

/**
 * Gets a fresh App Bridge session token (a short-lived JWT identifying the
 * embedded shop) — the platform-guaranteed way to authenticate requests,
 * since the iframe URL/host param and document.referrer don't reliably
 * carry the shop domain in Shopify's unified admin.shopify.com embed.
 */
export async function getSessionToken(): Promise<string | null> {
  const bridge = await waitForAppBridge();
  if (!bridge) return null;
  try {
    return await bridge.idToken();
  } catch {
    return null;
  }
}
