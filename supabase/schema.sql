-- ClassLoop hosted backend MVP.
-- Run this in Supabase SQL editor, then keep Row Level Security enabled.

create table if not exists public.classloop_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'teacher' check (role in ('teacher', 'student')),
  plan_tier text not null default 'free' check (plan_tier in ('free', 'pro')),
  subscription_status text not null default 'not_configured',
  stripe_customer_id text,
  subscription_id text,
  current_period_end timestamptz,
  no_training_on_student_data boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.classloop_workspace_state (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.classloop_pilot_feedback (
  id bigint generated always as identity primary key,
  owner_id uuid references auth.users(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  note text not null default '',
  role text not null default 'unknown',
  source text not null default 'pilot_feedback',
  transcript text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.classloop_profiles add column if not exists subscription_id text;
alter table public.classloop_profiles add column if not exists current_period_end timestamptz;
alter table public.classloop_pilot_feedback alter column owner_id drop not null;
alter table public.classloop_pilot_feedback add column if not exists role text not null default 'unknown';
alter table public.classloop_pilot_feedback add column if not exists source text not null default 'pilot_feedback';
alter table public.classloop_pilot_feedback add column if not exists transcript text not null default '';
alter table public.classloop_pilot_feedback add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists classloop_profiles_stripe_customer_id_idx
  on public.classloop_profiles(stripe_customer_id);

alter table public.classloop_profiles enable row level security;
alter table public.classloop_workspace_state enable row level security;
alter table public.classloop_pilot_feedback enable row level security;

drop policy if exists "profiles_select_own" on public.classloop_profiles;
create policy "profiles_select_own"
  on public.classloop_profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.classloop_profiles;
create policy "profiles_update_own"
  on public.classloop_profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "workspace_state_select_own" on public.classloop_workspace_state;
create policy "workspace_state_select_own"
  on public.classloop_workspace_state for select
  using (auth.uid() = owner_id);

drop policy if exists "workspace_state_insert_own" on public.classloop_workspace_state;
create policy "workspace_state_insert_own"
  on public.classloop_workspace_state for insert
  with check (auth.uid() = owner_id);

drop policy if exists "workspace_state_update_own" on public.classloop_workspace_state;
create policy "workspace_state_update_own"
  on public.classloop_workspace_state for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "feedback_insert_own" on public.classloop_pilot_feedback;
create policy "feedback_insert_own"
  on public.classloop_pilot_feedback for insert
  with check (auth.uid() = owner_id);

drop policy if exists "feedback_select_own" on public.classloop_pilot_feedback;
create policy "feedback_select_own"
  on public.classloop_pilot_feedback for select
  using (auth.uid() = owner_id);
