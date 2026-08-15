-- Run this once in the Supabase SQL editor for your project.
-- Safe to run more than once — it won't error if parts of it already exist.

create table if not exists season (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

alter table season enable row level security;

-- This app has no login system — all five of you share one open row.
-- Anyone with your Supabase URL + anon key can read and write it, same
-- trust model as a shared Google Doc. Don't reuse this project for
-- anything sensitive.
drop policy if exists "Public read" on season;
create policy "Public read" on season
  for select using (true);

drop policy if exists "Public insert" on season;
create policy "Public insert" on season
  for insert with check (true);

drop policy if exists "Public update" on season;
create policy "Public update" on season
  for update using (true);

-- Enables live sync so everyone's screen updates instantly, not just on
-- page refresh. Guarded so it doesn't error if it's already switched on.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'season'
  ) then
    alter publication supabase_realtime add table season;
  end if;
end $$;
