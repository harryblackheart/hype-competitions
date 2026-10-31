# Hype Competitions – Supabase Version

Data now syncs across all devices via Supabase.

## Setup (one time)

1. In Supabase go to **SQL Editor** and run the SQL below.
2. Upload all files in this folder to Neocities.

## SQL to run in Supabase

```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password text not null,
  credit numeric default 0,
  created_at timestamptz default now()
);

create table competitions (
  id bigint primary key generated always as identity,
  title text not null,
  prize_value numeric,
  total_tickets int,
  price numeric,
  sold_percent int default 0,
  end_date timestamptz,
  image text,
  created_at timestamptz default now()
);

create table instants (
  id bigint primary key generated always as identity,
  title text not null,
  value numeric,
  image text,
  created_at timestamptz default now()
);

create table winners (
  id bigint primary key generated always as identity,
  name text,
  prize text,
  ticket text,
  date text,
  created_at timestamptz default now()
);

alter table users enable row level security;
alter table competitions enable row level security;
alter table instants enable row level security;
alter table winners enable row level security;

create policy "public all" on users for all using (true) with check (true);
create policy "public all" on competitions for all using (true) with check (true);
create policy "public all" on instants for all using (true) with check (true);
create policy "public all" on winners for all using (true) with check (true);
```

## Admin
Username: admin  
Password: hype2026

## Notes
- Users, credits, competitions and winners are now shared across devices.
- PayPal top-ups still work and update credit in the database.
- For production you should tighten the RLS policies and stop storing passwords in plain text.
