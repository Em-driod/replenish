/**
 * Hand-written DB types — replace with `supabase gen types typescript`
 * once you've connected your Supabase project.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type POStatus = "draft" | "sent" | "partial" | "received" | "cancelled";
export type PlanName = "free" | "starter" | "growth";

// ── Row types (what SELECT returns) ──────────────────────────────────────────

export interface ShopRow {
  id: string;
  shopify_domain: string;
  access_token: string;
  plan_id: PlanName;
  installed_at: string;
  uninstalled_at: string | null;
  settings: Json;
  created_at: string;
}

export interface SupplierRow {
  id: string;
  shop_id: string;
  name: string;
  email: string | null;
  default_lead_time_days: number;
  default_currency: string;
  notes: string | null;
  created_at: string;
}

export interface ProductRow {
  id: string;
  shop_id: string;
  shopify_product_id: string;
  shopify_variant_id: string;
  title: string;
  sku: string | null;
  current_inventory: number;
  cost_per_unit: number | null;
  supplier_id: string | null;
  reorder_point: number | null;
  reorder_qty: number | null;
  is_tracked: boolean;
  updated_at: string;
  created_at: string;
}

export interface SalesVelocityRow {
  id: string;
  product_id: string;
  period_days: number;
  units_sold: number;
  avg_daily_sales: number;
  days_of_stock_remaining: number | null;
  computed_at: string;
}

export interface PurchaseOrderRow {
  id: string;
  shop_id: string;
  supplier_id: string;
  po_number: string;
  status: POStatus;
  expected_delivery_date: string | null;
  notes: string | null;
  created_at: string;
  sent_at: string | null;
  received_at: string | null;
}

export interface POLineItemRow {
  id: string;
  po_id: string;
  product_id: string;
  qty_ordered: number;
  qty_received: number;
  unit_cost: number | null;
  notes: string | null;
}

export interface ShopifySessionRow {
  id: string;
  shop: string;
  state: string | null;
  is_online: boolean;
  scope: string | null;
  expires: string | null;
  access_token: string | null;
  user_id: number | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  account_owner: boolean | null;
  locale: string | null;
  collaborator: boolean | null;
  email_verified: boolean | null;
}

// ── Database type (required by @supabase/supabase-js generic) ────────────────

export interface Database {
  public: {
    Tables: {
      shops: {
        Row: ShopRow;
        Insert: Partial<ShopRow> & { shopify_domain: string; access_token: string };
        Update: Partial<ShopRow>;
      };
      suppliers: {
        Row: SupplierRow;
        Insert: Partial<SupplierRow> & { shop_id: string; name: string };
        Update: Partial<SupplierRow>;
      };
      products: {
        Row: ProductRow;
        Insert: Partial<ProductRow> & { shop_id: string; shopify_product_id: string; shopify_variant_id: string; title: string };
        Update: Partial<ProductRow>;
      };
      sales_velocity: {
        Row: SalesVelocityRow;
        Insert: Partial<SalesVelocityRow> & { product_id: string; period_days: number; avg_daily_sales: number };
        Update: Partial<SalesVelocityRow>;
      };
      purchase_orders: {
        Row: PurchaseOrderRow;
        Insert: Partial<PurchaseOrderRow> & { shop_id: string; supplier_id: string; po_number: string };
        Update: Partial<PurchaseOrderRow>;
      };
      po_line_items: {
        Row: POLineItemRow;
        Insert: Partial<POLineItemRow> & { po_id: string; product_id: string; qty_ordered: number };
        Update: Partial<POLineItemRow>;
      };
      shopify_sessions: {
        Row: ShopifySessionRow;
        Insert: Partial<ShopifySessionRow> & { id: string; shop: string; is_online: boolean };
        Update: Partial<ShopifySessionRow>;
      };
      webhook_events: {
        Row: { id: string; shop_id: string | null; topic: string; shopify_id: string | null; processed_at: string | null; error: string | null; created_at: string };
        Insert: { topic: string; shop_id?: string | null; shopify_id?: string | null };
        Update: Record<string, never>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      po_status: POStatus;
      plan_name: PlanName;
    };
  };
}
