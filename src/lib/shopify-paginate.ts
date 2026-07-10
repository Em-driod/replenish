/**
 * Shopify's REST Admin API only supports cursor-based pagination via the
 * `Link` response header (the `page` query param was removed in API 2019-10+
 * and is silently ignored) — so callers must follow `rel="next"` until it's
 * absent, or they'll only ever see the first page.
 */
export async function fetchAllPages<T>(
  url: string,
  accessToken: string,
  key: string,
  maxPages = 40
): Promise<T[]> {
  const results: T[] = [];
  let nextUrl: string | null = url;
  let pages = 0;

  while (nextUrl && pages < maxPages) {
    const res: Response = await fetch(nextUrl, {
      headers: { "X-Shopify-Access-Token": accessToken },
    });
    if (!res.ok) break;

    const body = await res.json();
    const items: T[] = body[key] ?? [];
    results.push(...items);
    pages++;

    const link = res.headers.get("Link") ?? res.headers.get("link");
    const nextMatch = link?.split(",").find((part) => part.includes('rel="next"'));
    const urlMatch = nextMatch?.match(/<([^>]+)>/);
    nextUrl = urlMatch ? urlMatch[1] : null;
  }

  return results;
}
