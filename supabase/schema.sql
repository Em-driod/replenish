-- ============================================================
-- Replenish — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ── ENUMS ────────────────────────────────────────────────────
create type po_status as enum ('draft', 'sent', 'partial', 'received', 'cancelled');
create type plan_name as enum ('free', 'starter', 'growth');

-- ── SHOPS ────────────────────────────────────────────────────
create table shops (
  id                uuid primary key default gen_random_uuid(),
  shopify_domain    varchar(255) not null unique,
  access_token      text not null,
  plan_id           plan_name not null default 'free',
  installed_at      timestamptz not null default now(),
  uninstalled_at    timestamptz,
  settings          jsonb not null default '{
    "lead_time_buffer_days": 7,
    "forecast_window_days": 60,
    "low_stock_digest_enabled": true,
    "digest_email": null
  }'::jsonb,
  created_at        timestamptz not null default now()
);

-- ── SUPPLIERS ────────────────────────────────────────────────
create table suppliers (
  id                    uuid primary key default gen_random_uuid(),
  shop_id               uuid not null references shops(id) on delete cascade,
  name                  varchar(255) not null,
  email                 varchar(255),
  default_lead_time_days int not null default 14,
  default_currency      varchar(3) not null default 'USD',
  notes                 text,
  created_at            timestamptz not null default now()
);

create index idx_suppliers_shop_id on suppliers(shop_id);

-- ── PRODUCTS ─────────────────────────────────────────────────
create table products (
  id                    uuid primary key default gen_random_uuid(),
  shop_id               uuid not null references shops(id) on delete cascade,
  shopify_product_id    varchar(50) not null,
  shopify_variant_id    varchar(50) not null,
  title                 text not null,
  sku                   varchar(255),
  current_inventory     int not null default 0,
  cost_per_unit         decimal(10, 4),
  supplier_id           uuid references suppliers(id) on delete set null,
  reorder_point         int,
  reorder_qty           int,
  is_tracked            boolean not null default false,
  updated_at            timestamptz not null default now(),
  created_at            timestamptz not null default now(),
  unique(shop_id, shopify_variant_id)
);

create index idx_products_shop_id on products(shop_id);
create index idx_products_below_reorder on products(shop_id, is_tracked)
  where is_tracked = true;

-- ── SALES VELOCITY ───────────────────────────────────────────
create table sales_velocity (
  id                    uuid primary key default gen_random_uuid(),
  product_id            uuid not null references products(id) on delete cascade,
  period_days           int not null,  -- 30 | 60 | 90
  units_sold            int not null default 0,
  avg_daily_sales       decimal(10, 4) not null default 0,
  days_of_stock_remaining decimal(10, 2),
  computed_at           timestamptz not null default now(),
  unique(product_id, period_days)
);

create index idx_velocity_product_id on sales_velocity(product_id);

-- ── PURCHASE ORDERS ──────────────────────────────────────────
create table purchase_orders (
  id                    uuid primary key default gen_random_uuid(),
  shop_id               uuid not null references shops(id) on delete cascade,
  supplier_id           uuid not null references suppliers(id),
  po_number             varchar(50) not null,
  status                po_status not null default 'draft',
  expected_delivery_date date,
  notes                 text,
  created_at            timestamptz not null default now(),
  sent_at               timestamptz,
  received_at           timestamptz,
  unique(shop_id, po_number)
);

create index idx_po_shop_id on purchase_orders(shop_id);
create index idx_po_status on purchase_orders(shop_id, status);

-- ── PO LINE ITEMS ─────────────────────────────────────────────
create table po_line_items (
  id            uuid primary key default gen_random_uuid(),
  po_id         uuid not null references purchase_orders(id) on delete cascade,
  product_id    uuid not null references products(id),
  qty_ordered   int not null,
  qty_received  int not null default 0,
  unit_cost     decimal(10, 4),
  notes         text
);

create index idx_po_lines_po_id on po_line_items(po_id);

-- ── SESSION STORAGE (Shopify OAuth) ──────────────────────────
-- Stores Shopify sessions (replaces in-memory session storage)
create table shopify_sessions (
  id          text primary key,
  shop        varchar(255) not null,
  state       varchar(255),
  is_online   boolean not null default false,
  scope       text,
  expires     timestamptz,
  access_token text,
  user_id     bigint,
  first_name  text,
  last_name   text,
  email       text,
  account_owner boolean,
  locale      text,
  collaborator boolean,
  email_verified boolean
);

create index idx_sessions_shop on shopify_sessions(shop);

-- ── WEBHOOK EVENTS ────────────────────────────────────────────
create table webhook_events (
  id            uuid primary key default gen_random_uuid(),
  shop_id       uuid references shops(id) on delete cascade,
  topic         varchar(100) not null,
  shopify_id    varchar(100),
  processed_at  timestamptz,
  error         text,
  created_at    timestamptz not null default now()
);

-- ── RLS POLICIES ──────────────────────────────────────────────
-- All data access goes through service role key in API routes.
-- RLS is enabled but service role bypasses it — keeping it clean.
alter table shops enable row level security;
alter table suppliers enable row level security;
alter table products enable row level security;
alter table sales_velocity enable row level security;
alter table purchase_orders enable row level security;
alter table po_line_items enable row level security;
alter table shopify_sessions enable row level security;
alter table webhook_events enable row level security;

-- ── HELPER: Auto-generate PO numbers ──────────────────────────
create or replace function generate_po_number(p_shop_id uuid)
returns text language plpgsql as $$
declare
  v_count int;
  v_year  text;
begin
  v_year  := to_char(now(), 'YYYY');
  select count(*) + 1 into v_count
  from purchase_orders
  where shop_id = p_shop_id
    and to_char(created_at, 'YYYY') = v_year;
  return 'PO-' || v_year || '-' || lpad(v_count::text, 4, '0');
end;
$$;
