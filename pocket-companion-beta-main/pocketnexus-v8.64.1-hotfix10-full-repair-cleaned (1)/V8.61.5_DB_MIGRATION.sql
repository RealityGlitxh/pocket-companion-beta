-- V8.61.5 — Daily Challenges + Training Streaks + Profile Showcase
-- Apply through the Supabase migration workflow before enabling signed-in showcase sync.

create table if not exists public.training_profile_showcase (
  user_id uuid primary key references auth.users(id) on delete cascade,
  achievement_keys text[] not null default '{}',
  updated_at timestamptz not null default now(),
  constraint training_profile_showcase_max_three check (cardinality(achievement_keys) <= 3)
);

alter table public.training_profile_showcase enable row level security;
drop policy if exists "training showcase owner read" on public.training_profile_showcase;
create policy "training showcase owner read" on public.training_profile_showcase for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "training showcase owner insert" on public.training_profile_showcase;
create policy "training showcase owner insert" on public.training_profile_showcase for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "training showcase owner update" on public.training_profile_showcase;
create policy "training showcase owner update" on public.training_profile_showcase for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- The app derives daily challenges from already owner-scoped result rows:
-- complete daily card +10, solve +20, solve in <=3 guesses +30, first Brain Teaser activity that day +15.
-- This keeps challenge state deterministic and avoids a second mutable claim ledger.
