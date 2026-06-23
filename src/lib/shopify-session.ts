/**
 * Custom Shopify session storage backed by Supabase.
 * Implements the SessionStorage interface from @shopify/shopify-api.
 */
import { Session } from "@shopify/shopify-api";
import { createAdminClient } from "./supabase/server";

export const supabaseSessionStorage = {
  async storeSession(session: Session): Promise<boolean> {
    const supabase = createAdminClient();
    const { error } = await supabase.from("shopify_sessions").upsert(
      {
        id: session.id,
        shop: session.shop,
        state: session.state,
        is_online: session.isOnline,
        scope: session.scope,
        expires: session.expires?.toISOString() ?? null,
        access_token: session.accessToken ?? null,
        user_id: (session as any).onlineAccessInfo?.associated_user?.id ?? null,
        first_name: (session as any).onlineAccessInfo?.associated_user?.first_name ?? null,
        last_name: (session as any).onlineAccessInfo?.associated_user?.last_name ?? null,
        email: (session as any).onlineAccessInfo?.associated_user?.email ?? null,
        account_owner: (session as any).onlineAccessInfo?.associated_user?.account_owner ?? null,
        locale: (session as any).onlineAccessInfo?.associated_user?.locale ?? null,
        collaborator: (session as any).onlineAccessInfo?.associated_user?.collaborator ?? null,
        email_verified: (session as any).onlineAccessInfo?.associated_user?.email_verified ?? null,
      },
      { onConflict: "id" }
    );
    return !error;
  },

  async loadSession(id: string): Promise<Session | undefined> {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("shopify_sessions")
      .select("*")
      .eq("id", id)
      .single();

    if (!data) return undefined;

    const session = new Session({
      id: data.id,
      shop: data.shop,
      state: data.state ?? "",
      isOnline: data.is_online,
    });

    session.scope = data.scope ?? undefined;
    session.expires = data.expires ? new Date(data.expires) : undefined;
    session.accessToken = data.access_token ?? undefined;

    return session;
  },

  async deleteSession(id: string): Promise<boolean> {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("shopify_sessions")
      .delete()
      .eq("id", id);
    return !error;
  },

  async deleteSessions(ids: string[]): Promise<boolean> {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("shopify_sessions")
      .delete()
      .in("id", ids);
    return !error;
  },

  async findSessionsByShop(shop: string): Promise<Session[]> {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("shopify_sessions")
      .select("*")
      .eq("shop", shop);

    if (!data) return [];

    return data.map((row: Record<string, any>) => {
      const session = new Session({
        id: row.id,
        shop: row.shop,
        state: row.state ?? "",
        isOnline: row.is_online,
      });
      session.scope = row.scope ?? undefined;
      session.expires = row.expires ? new Date(row.expires) : undefined;
      session.accessToken = row.access_token ?? undefined;
      return session;
    });
  },
};
