-- PocketNexus V8.64.1 Hotfix 2
-- Combined competitive meta + matchup matrix.
-- The client intentionally presents this as one combined competitive sample.

create or replace function public.get_combined_competitive_meta(
  p_days integer default 30,
  p_limit integer default 50
)
returns table(
  archetype text,
  appearances bigint,
  wins bigint,
  losses bigint,
  ties bigint,
  games bigint,
  win_rate numeric,
  meta_share numeric,
  confidence_label text,
  tournament_count bigint,
  sample_games bigint
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
with params as (
  select greatest(1, least(coalesce(p_days,30), 365))::int as days
),
limitless_decks as (
  select
    lower(regexp_replace(trim(a.name), '\s+', ' ', 'g')) as k,
    max(a.name) as archetype,
    count(distinct d.id)::bigint as appearances,
    count(distinct d.tournament_id)::bigint as tournament_count
  from public.meta_decklists d
  join public.meta_archetypes a on a.id=d.archetype_id
  join public.meta_tournaments t on t.id=d.tournament_id
  cross join params p
  where d.is_valid is true
    and d.archetype_id is not null
    and t.start_date >= now() - make_interval(days => p.days)
  group by 1
),
pnc_decks as (
  select
    lower(regexp_replace(trim(a.archetype), '\s+', ' ', 'g')) as k,
    max(a.archetype) as archetype,
    sum(a.appearances)::bigint as appearances,
    count(distinct a.event_id)::bigint as tournament_count
  from public.competitive_event_archetypes a
  group by 1
),
appearances as (
  select
    k,
    max(archetype) as archetype,
    sum(appearances)::bigint as appearances,
    sum(tournament_count)::bigint as tournament_count
  from (
    select * from limitless_decks
    union all
    select * from pnc_decks
  ) x
  group by k
),
limitless_sides as (
  select
    lower(regexp_replace(trim(a.name), '\s+', ' ', 'g')) as k,
    case
      when m.result='tie' then 'T'
      when m.winner_player_id=d.player_id then 'W'
      when m.winner_player_id is not null then 'L'
      else 'N'
    end as outcome
  from public.meta_matches m
  join public.meta_tournaments t on t.id=m.tournament_id
  join public.meta_decklists d on d.id=m.player1_decklist_id and d.is_valid is true and d.archetype_id is not null
  join public.meta_archetypes a on a.id=d.archetype_id
  cross join params p
  where t.start_date >= now() - make_interval(days => p.days)
  union all
  select
    lower(regexp_replace(trim(a.name), '\s+', ' ', 'g')) as k,
    case
      when m.result='tie' then 'T'
      when m.winner_player_id=d.player_id then 'W'
      when m.winner_player_id is not null then 'L'
      else 'N'
    end as outcome
  from public.meta_matches m
  join public.meta_tournaments t on t.id=m.tournament_id
  join public.meta_decklists d on d.id=m.player2_decklist_id and d.is_valid is true and d.archetype_id is not null
  join public.meta_archetypes a on a.id=d.archetype_id
  cross join params p
  where t.start_date >= now() - make_interval(days => p.days)
),
pnc_sides as (
  select lower(regexp_replace(trim(m.deck_a_canonical), '\s+', ' ', 'g')) as k,
         case when upper(coalesce(m.winner_side,''))='A' then 'W' when upper(coalesce(m.winner_side,''))='B' then 'L' else 'T' end as outcome
  from public.competitive_matches m
  where nullif(trim(m.deck_a_canonical),'') is not null
  union all
  select lower(regexp_replace(trim(m.deck_b_canonical), '\s+', ' ', 'g')) as k,
         case when upper(coalesce(m.winner_side,''))='B' then 'W' when upper(coalesce(m.winner_side,''))='A' then 'L' else 'T' end as outcome
  from public.competitive_matches m
  where nullif(trim(m.deck_b_canonical),'') is not null
),
results as (
  select
    k,
    count(*) filter (where outcome='W')::bigint as wins,
    count(*) filter (where outcome='L')::bigint as losses,
    count(*) filter (where outcome='T')::bigint as ties,
    count(*) filter (where outcome in ('W','L','T'))::bigint as games
  from (
    select * from limitless_sides
    union all
    select * from pnc_sides
  ) s
  group by k
),
joined as (
  select
    a.archetype,
    a.appearances,
    coalesce(r.wins,0)::bigint as wins,
    coalesce(r.losses,0)::bigint as losses,
    coalesce(r.ties,0)::bigint as ties,
    coalesce(r.games,0)::bigint as games,
    case when coalesce(r.wins,0)+coalesce(r.losses,0)>0
      then round(100.0*coalesce(r.wins,0)/(coalesce(r.wins,0)+coalesce(r.losses,0)),1)
      else null end as win_rate,
    round(100.0*a.appearances/nullif(sum(a.appearances) over (),0),1) as meta_share,
    case
      when coalesce(r.games,0)>=100 then 'VERY HIGH'
      when coalesce(r.games,0)>=40 then 'HIGH'
      when coalesce(r.games,0)>=15 then 'MEDIUM'
      else 'LOW'
    end as confidence_label,
    a.tournament_count,
    sum(coalesce(r.games,0)) over ()::bigint as sample_games
  from appearances a
  left join results r using(k)
)
select * from joined
order by meta_share desc nulls last, games desc, archetype
limit greatest(1,least(coalesce(p_limit,50),200));
$function$;

grant execute on function public.get_combined_competitive_meta(integer,integer) to anon, authenticated;

create or replace function public.get_combined_matchup_matrix(
  p_days integer default 30,
  p_top integer default 12
)
returns table(
  archetype text,
  opponent text,
  wins bigint,
  losses bigint,
  ties bigint,
  games bigint,
  win_rate numeric
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
with params as (
  select greatest(1,least(coalesce(p_days,30),365))::int as days,
         greatest(4,least(coalesce(p_top,12),24))::int as topn
),
limitless_pairs as (
  select
    a1.name as archetype,
    a2.name as opponent,
    case when m.result='tie' then 'T' when m.winner_player_id=d1.player_id then 'W' when m.winner_player_id is not null then 'L' else 'N' end as outcome
  from public.meta_matches m
  join public.meta_tournaments t on t.id=m.tournament_id
  join public.meta_decklists d1 on d1.id=m.player1_decklist_id and d1.is_valid is true and d1.archetype_id is not null
  join public.meta_decklists d2 on d2.id=m.player2_decklist_id and d2.is_valid is true and d2.archetype_id is not null
  join public.meta_archetypes a1 on a1.id=d1.archetype_id
  join public.meta_archetypes a2 on a2.id=d2.archetype_id
  cross join params p
  where t.start_date >= now()-make_interval(days=>p.days)
  union all
  select
    a2.name,
    a1.name,
    case when m.result='tie' then 'T' when m.winner_player_id=d2.player_id then 'W' when m.winner_player_id is not null then 'L' else 'N' end
  from public.meta_matches m
  join public.meta_tournaments t on t.id=m.tournament_id
  join public.meta_decklists d1 on d1.id=m.player1_decklist_id and d1.is_valid is true and d1.archetype_id is not null
  join public.meta_decklists d2 on d2.id=m.player2_decklist_id and d2.is_valid is true and d2.archetype_id is not null
  join public.meta_archetypes a1 on a1.id=d1.archetype_id
  join public.meta_archetypes a2 on a2.id=d2.archetype_id
  cross join params p
  where t.start_date >= now()-make_interval(days=>p.days)
),
pnc_pairs as (
  select m.deck_a_canonical as archetype,m.deck_b_canonical as opponent,
         case when upper(coalesce(m.winner_side,''))='A' then 'W' when upper(coalesce(m.winner_side,''))='B' then 'L' else 'T' end as outcome
  from public.competitive_matches m
  where nullif(trim(m.deck_a_canonical),'') is not null and nullif(trim(m.deck_b_canonical),'') is not null
  union all
  select m.deck_b_canonical,m.deck_a_canonical,
         case when upper(coalesce(m.winner_side,''))='B' then 'W' when upper(coalesce(m.winner_side,''))='A' then 'L' else 'T' end
  from public.competitive_matches m
  where nullif(trim(m.deck_a_canonical),'') is not null and nullif(trim(m.deck_b_canonical),'') is not null
),
all_pairs as (
  select lower(regexp_replace(trim(archetype),'\s+',' ','g')) ak,
         lower(regexp_replace(trim(opponent),'\s+',' ','g')) ok,
         archetype,opponent,outcome
  from (
    select * from limitless_pairs
    union all
    select * from pnc_pairs
  ) z
  where outcome in ('W','L','T')
),
ranked as (
  select ak,max(archetype) archetype,count(*) games,
         dense_rank() over(order by count(*) desc) rnk
  from all_pairs group by ak
),
top_keys as (select ak,archetype from ranked,params where rnk<=params.topn),
agg as (
 select
   ta.archetype,
   to2.archetype as opponent,
   count(*) filter(where p.outcome='W')::bigint wins,
   count(*) filter(where p.outcome='L')::bigint losses,
   count(*) filter(where p.outcome='T')::bigint ties,
   count(*)::bigint games
 from all_pairs p
 join top_keys ta on ta.ak=p.ak
 join top_keys to2 on to2.ak=p.ok
 group by ta.archetype,to2.archetype
)
select archetype,opponent,wins,losses,ties,games,
       case when wins+losses>0 then round(100.0*wins/(wins+losses),1) else null end as win_rate
from agg
order by archetype,opponent;
$function$;

grant execute on function public.get_combined_matchup_matrix(integer,integer) to anon, authenticated;
