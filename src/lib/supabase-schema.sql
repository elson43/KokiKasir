-- ============================================================
-- KokiKasir — Supabase Schema
-- Run this in your Supabase SQL Editor (project > SQL Editor > New Query)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. PROFILES (Store Settings per user)
-- ============================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  store_name  text,
  phone       text,
  hours       text,
  bio         text,
  logo        text,       -- base64 or public URL
  qris_image  text,       -- base64 or public URL
  updated_at  timestamptz default now(),
  sync_status text        default 'synced'
);

alter table public.profiles enable row level security;
create policy "Users can manage their own profile"
  on public.profiles for all using (auth.uid() = id);

-- ============================================================
-- 2. MENU_ITEMS
-- ============================================================
create table if not exists public.menu_items (
  id          text        primary key,
  user_id     uuid        references auth.users(id) on delete cascade,
  name        text        not null,
  category    text,
  price       integer,
  status      text        default 'Tersedia',
  image       text,
  description text,
  sync_status text        default 'synced',
  updated_at  timestamptz default now()
);

alter table public.menu_items enable row level security;
create policy "Users manage their own menu"
  on public.menu_items for all using (auth.uid() = user_id);

-- ============================================================
-- 3. ORDERS (Transactions)
-- ============================================================
create table if not exists public.orders (
  id              text        primary key,
  user_id         uuid        references auth.users(id) on delete cascade,
  customer_name   text,
  order_type      text,
  items           jsonb,
  total           integer,
  status          text,       -- 'UNPAID' | 'PAID'
  payment_method  text,
  cash_given      integer,
  change          integer,
  paid_at         text,
  paid_timestamp  bigint,
  date            text,       -- 'YYYY-MM-DD' WIB
  created_at      text,
  sync_status     text        default 'synced',
  updated_at      timestamptz default now()
);

alter table public.orders enable row level security;
create policy "Users manage their own orders"
  on public.orders for all using (auth.uid() = user_id);

-- ============================================================
-- 4. ERROR_LOGS
-- ============================================================
create table if not exists public.error_logs (
  id              text        primary key,
  user_id         uuid        references auth.users(id) on delete set null,
  timestamp       timestamptz,
  message         text,
  stack           text,
  component_stack text,
  route           text,
  app_version     text,
  reported        boolean     default false,
  created_at      timestamptz default now()
);

alter table public.error_logs enable row level security;
create policy "Users insert their own logs"
  on public.error_logs for insert with check (auth.uid() = user_id);
create policy "Users read their own logs"
  on public.error_logs for select using (auth.uid() = user_id);
create policy "Users update their own logs"
  on public.error_logs for update using (auth.uid() = user_id);

-- ============================================================
-- Indexes for performance
-- ============================================================
create index if not exists idx_menu_items_user_id on public.menu_items(user_id);
create index if not exists idx_orders_user_id     on public.orders(user_id);
create index if not exists idx_orders_date        on public.orders(date);
create index if not exists idx_error_logs_user_id on public.error_logs(user_id);
create index if not exists idx_error_logs_reported on public.error_logs(reported);
