-- Fixmind Pro sync schema.
--
-- Run this once in a free Supabase project's SQL editor (Project > SQL Editor > New query).
-- Lessons are stored as opaque ciphertext: this schema never sees plaintext lesson
-- content, only an ID, a timestamp, and an encrypted blob keyed by the user's own
-- passphrase (derived client-side, never sent to Supabase).

-- One row per user: holds the (non-secret) salt used to derive the
-- encryption key from the user's passphrase on every machine. The salt
-- must match across machines so the same passphrase derives the same key;
-- the passphrase itself is never written here or anywhere server-side.
create table if not exists public.sync_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  salt text not null,
  verifier_ciphertext text not null,
  verifier_iv text not null,
  created_at timestamptz not null default now()
);

alter table public.sync_users enable row level security;

create policy "sync_users_select_own" on public.sync_users
  for select using (auth.uid() = user_id);

create policy "sync_users_insert_own" on public.sync_users
  for insert with check (auth.uid() = user_id);

create table if not exists public.lessons_sync (
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id text not null,
  ciphertext text not null,
  iv text not null,
  updated_at timestamptz not null,
  deleted boolean not null default false,
  primary key (user_id, lesson_id)
);

create index if not exists lessons_sync_updated_at_idx
  on public.lessons_sync (user_id, updated_at);

alter table public.lessons_sync enable row level security;

-- Each user may only read/write their own rows. auth.uid() comes from the
-- Supabase Auth JWT attached to the client's session.
create policy "lessons_sync_select_own" on public.lessons_sync
  for select using (auth.uid() = user_id);

create policy "lessons_sync_insert_own" on public.lessons_sync
  for insert with check (auth.uid() = user_id);

create policy "lessons_sync_update_own" on public.lessons_sync
  for update using (auth.uid() = user_id);

create policy "lessons_sync_delete_own" on public.lessons_sync
  for delete using (auth.uid() = user_id);

-- Pro/Team entitlements, written only by the polar-webhook Edge Function
-- (using the service-role key, which bypasses RLS). Keyed by email rather
-- than user_id so a Polar subscription can be recorded before the
-- subscriber has ever signed in to fixmind. No insert/update/delete policy
-- is defined for the anon/authenticated roles, so the CLI's anon key can
-- only ever read its own row, never write one.
create table if not exists public.entitlements (
  email text primary key,
  plan text not null,
  status text not null,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.entitlements enable row level security;

create policy "entitlements_select_own" on public.entitlements
  for select using (email = (auth.jwt() ->> 'email'));
