-- Vlog storage for the site's /vlog.html timeline.
--
-- Two columns by design: a date and the text. Day numbers ("D01", "D02") are
-- derived on the client from date order, so there is no counter column to keep
-- in sync — insert a row and it becomes the next day automatically.
--
-- Idempotent: safe to run more than once.

create table if not exists public.vlog_entries (
  id         bigint generated always as identity primary key,
  date       date not null,
  content    text not null,
  created_at timestamptz not null default now()
);

comment on table public.vlog_entries is
  'Day-by-day log rendered on vlog.html. Public read via RLS; writes are dashboard-only.';

-- Newest-first reads are the only access pattern.
create index if not exists vlog_entries_date_idx
  on public.vlog_entries (date desc);

-- ---------------------------------------------------------------------------
-- Row Level Security.
--
-- This is what makes it safe to ship the publishable key in the page. The key
-- is a public identifier, not a secret; these policies are the actual control.
-- Anonymous visitors get SELECT and nothing else — no insert/update/delete
-- policy exists, so RLS denies those even with a valid key. Writes go through
-- the Supabase dashboard under your own authenticated session.
-- ---------------------------------------------------------------------------
alter table public.vlog_entries enable row level security;

drop policy if exists "public read" on public.vlog_entries;
create policy "public read"
  on public.vlog_entries
  for select
  to anon, authenticated
  using (true);
