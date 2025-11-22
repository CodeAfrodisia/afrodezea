-- supabase/sql/schema.sql
-- Phase 1 scaffold for Afrodezea World
-- Core tables (stubs) per spec. Add columns as needed in Phase 2.

-- artists
create table if not exists artists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  avatar_url text,
  bio text,
  archetypes text[] default '{}',
  created_at timestamptz default now()
);

-- themes (Afrodisia rooms as themes)
create table if not exists themes (
  id text primary key,
  description text,
  color_palette text[] default '{}',
  sound_url text
);

-- rooms (for future 3D expansions; maps to theme)
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  theme_id text references themes(id) on delete set null,
  name text,
  created_at timestamptz default now()
);

-- artworks
create table if not exists artworks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist_id uuid references artists(id) on delete set null,
  theme_id text references themes(id) on delete set null,
  image_url text,
  tier text check (tier in ('digital','print','original')),
  story text,
  created_at timestamptz default now()
);

-- editions
create table if not exists artwork_editions (
  id uuid primary key default gen_random_uuid(),
  artwork_id uuid references artworks(id) on delete cascade,
  type text check (type in ('open','limited','original')) not null,
  size int,
  remaining int,
  created_at timestamptz default now()
);

-- pricing
create table if not exists artwork_pricing (
  id uuid primary key default gen_random_uuid(),
  artwork_id uuid references artworks(id) on delete cascade,
  desired_earnings_cents int not null,
  commission_rate numeric not null,
  total_price_cents int not null,
  currency text default 'USD',
  created_at timestamptz default now()
);

-- orders + items
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  buyer_email text,
  total_cents int,
  status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  artwork_id uuid references artworks(id) on delete set null,
  tier text,
  price_cents int,
  status text default 'pending', -- pending|fulfilled|cancelled
  created_at timestamptz default now()
);

-- payouts (Stripe Connect summaries later)
create table if not exists payouts (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid references artists(id) on delete set null,
  amount_cents int,
  status text default 'pending',
  created_at timestamptz default now()
);

-- certificates
create table if not exists certificates (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  order_item_id uuid references order_items(id) on delete set null,
  artwork_id uuid references artworks(id) on delete set null,
  buyer_email text,
  pdf_url text,
  metadata jsonb,
  created_at timestamptz default now()
);

-- vault items (ownership view)
create table if not exists vault_items (
  id uuid primary key default gen_random_uuid(),
  certificate_id uuid references certificates(id) on delete cascade,
  owner_email text,
  created_at timestamptz default now()
);

-- registry (public verification)
create table if not exists registry_verifications (
  id uuid primary key default gen_random_uuid(),
  code text references certificates(code) on delete cascade,
  hash text,
  verified_at timestamptz
);

-- TODO RLS policies per table (owner_email/email-based access, insert/update by service role)
-- alter table ... enable row level security;

-- Trigger + function stubs
-- Generates a certificate when an order_item is marked fulfilled
create or replace function fn_issue_certificate() returns trigger as $$
begin
  -- TODO: generate AFD-YYYY-NNNNNN code, build metadata JSON, store pdf in bucket, insert cert + vault item
  return new;
end;
$$ language plpgsql;

create or replace trigger trg_issue_certificate
after update of status on order_items
for each row
when (new.status = 'fulfilled')
execute procedure fn_issue_certificate();
