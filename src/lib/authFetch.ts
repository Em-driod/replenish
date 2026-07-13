"use client";

import { getSessionToken } from "./appBridge";

/** fetch() with an App Bridge session token attached, so the server can identify the shop. */
export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getSessionToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(path, { ...init, headers });
}
