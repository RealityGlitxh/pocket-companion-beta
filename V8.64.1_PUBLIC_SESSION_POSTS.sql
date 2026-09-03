create table if not exists public.profile_session_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_local_id text not null,
  title text not null default 'Battle Session',
  session_type text,
  deck_name text,
  deck_archetype text,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_minutes integer not null default 0 check (duration_minutes >= 0),
  wins integer not null default 0 check (wins >= 0),
  losses integer not null default 0 check (losses >= 0),
  ties integer not null default 0 check (ties >= 0),
  matches integer not null default 0 check (matches >= 0),
  win_rate numeric(5,2) not null default 0 check (win_rate >= 0 and win_rate <= 100),
  rank_change integer,
  starting_rp integer,
  ending_rp integer,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, session_local_id)
);

alter table public.profile_session_posts enable row level security;

drop policy if exists "session posts owner read" on public.profile_session_posts;
create policy "session posts owner read" on public.profile_session_posts
for select to authenticated using (auth.uid() = user_id);

drop policy if exists "session posts owner insert" on public.profile_session_posts;
create policy "session posts owner insert" on public.profile_session_posts
for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "session posts owner update" on public.profile_session_posts;
create policy "session posts owner update" on public.profile_session_posts
for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "session posts owner delete" on public.profile_session_posts;
create policy "session posts owner delete" on public.profile_session_posts
for delete to authenticated using (auth.uid() = user_id);

create or replace function public.get_public_session_posts(p_user_id uuid, p_limit integer default 12)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select case
    when exists (
      select 1 from public.profiles p
      where p.id = p_user_id
        and coalesce((p.privacy->>'public_profile')::boolean, true)
    ) then coalesce((
      select jsonb_agg(to_jsonb(x) order by x.started_at desc)
      from (
        select id, title, session_type, deck_name, deck_archetype,
               started_at, ended_at, duration_minutes,
               wins, losses, ties, matches, win_rate,
               rank_change, starting_rp, ending_rp
        from public.profile_session_posts
        where user_id = p_user_id and is_public = true
        order by started_at desc
        limit greatest(1, least(coalesce(p_limit, 12), 50))
      ) x
    ), '[]'::jsonb)
    else '[]'::jsonb
  end;
$function$;

grant execute on function public.get_public_session_posts(uuid, integer) to anon, authenticated;
