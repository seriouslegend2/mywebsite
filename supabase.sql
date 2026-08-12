-- Vlog storage for seriouslegend2.github.io/mywebsite
-- Run this once in the Supabase SQL editor.
--
-- Two columns, by design: a date and the text. Day numbers ("D01", "D02") are
-- derived on the client from date order, so there is no counter to keep in
-- sync — insert a row and it becomes the next day automatically.

create table if not exists public.vlog_entries (
  id         bigint generated always as identity primary key,
  date       date not null,
  content    text not null,
  created_at timestamptz not null default now()
);

-- Newest-first reads are the only access pattern.
create index if not exists vlog_entries_date_idx
  on public.vlog_entries (date desc);

-- Row Level Security is what makes it safe to ship the anon key in the page.
alter table public.vlog_entries enable row level security;

-- Anonymous visitors may read, and nothing else. No insert/update/delete
-- policy exists, so RLS denies those for anon even though the key is public.
-- Writes happen through the Supabase dashboard, which uses your own session.
drop policy if exists "public read" on public.vlog_entries;
create policy "public read"
  on public.vlog_entries
  for select
  to anon
  using (true);

-- Sanity check: this should return 0 rows for anon, not an error.
--   select date, content from public.vlog_entries order by date desc;

-- Adding a day, for reference:
--   insert into public.vlog_entries (date, content)
--   values (current_date, 'What happened today.');
