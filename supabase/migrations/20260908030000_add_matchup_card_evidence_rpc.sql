create or replace function public.get_matchup_card_evidence(
  p_archetype_ids text[],
  p_since timestamptz default (now() - interval '7 days'),
  p_min_matchup_games integer default 8,
  p_min_card_games integer default 5
)
returns table(
  archetype_id text,
  opponent_archetype_id text,
  card_name text,
  set_code text,
  card_number text,
  matchup_games integer,
  matchup_wins integer,
  matchup_win_rate numeric,
  card_games integer,
  card_wins integer,
  card_losses integer,
  card_win_rate numeric,
  card_inclusion_rate numeric,
  win_rate_delta numeric
)
language sql
stable
security definer
set search_path = public
as $$
with sides as (
  select m.id as match_id,d1.id as decklist_id,d1.archetype_id,d2.archetype_id as opponent_archetype_id,
    (m.winner_player_id=m.player1_id) as won,
    (m.winner_player_id is not null and m.winner_player_id<>m.player1_id) as lost
  from public.meta_matches m
  join public.meta_decklists d1 on d1.id=m.player1_decklist_id
  join public.meta_decklists d2 on d2.id=m.player2_decklist_id
  where m.created_at>=p_since and d1.is_valid=true and d2.is_valid=true
    and d1.archetype_id=any(p_archetype_ids) and d1.archetype_id is not null and d2.archetype_id is not null
  union all
  select m.id,d2.id,d2.archetype_id,d1.archetype_id,
    (m.winner_player_id=m.player2_id),
    (m.winner_player_id is not null and m.winner_player_id<>m.player2_id)
  from public.meta_matches m
  join public.meta_decklists d1 on d1.id=m.player1_decklist_id
  join public.meta_decklists d2 on d2.id=m.player2_decklist_id
  where m.created_at>=p_since and d1.is_valid=true and d2.is_valid=true
    and d2.archetype_id=any(p_archetype_ids) and d1.archetype_id is not null and d2.archetype_id is not null
),baseline as (
  select archetype_id,opponent_archetype_id,
    count(*) filter(where won or lost)::integer as matchup_games,
    count(*) filter(where won)::integer as matchup_wins,
    case when count(*) filter(where won or lost)>0 then round(100.0*count(*) filter(where won)/count(*) filter(where won or lost),4) end as matchup_win_rate
  from sides group by archetype_id,opponent_archetype_id
),side_cards as (
  select distinct s.match_id,s.archetype_id,s.opponent_archetype_id,s.won,s.lost,
    coalesce(c.card->>'name','') as card_name,coalesce(c.card->>'set','') as set_code,coalesce(c.card->>'number','') as card_number
  from sides s join public.meta_decklists d on d.id=s.decklist_id
  cross join lateral (
    select value as card from jsonb_array_elements(coalesce(d.cards->'pokemon','[]'::jsonb))
    union all
    select value as card from jsonb_array_elements(coalesce(d.cards->'trainer','[]'::jsonb))
  ) c where coalesce(c.card->>'name','')<>''
),card_stats as (
  select archetype_id,opponent_archetype_id,lower(card_name) as card_key,max(card_name) as card_name,
    max(set_code) as set_code,max(card_number) as card_number,
    count(*) filter(where won or lost)::integer as card_games,
    count(*) filter(where won)::integer as card_wins,
    count(*) filter(where lost)::integer as card_losses,
    case when count(*) filter(where won or lost)>0 then round(100.0*count(*) filter(where won)/count(*) filter(where won or lost),4) end as card_win_rate
  from side_cards group by archetype_id,opponent_archetype_id,lower(card_name)
)
select c.archetype_id,c.opponent_archetype_id,c.card_name,c.set_code,c.card_number,
  b.matchup_games,b.matchup_wins,b.matchup_win_rate,c.card_games,c.card_wins,c.card_losses,c.card_win_rate,
  round(c.card_games::numeric/nullif(b.matchup_games,0),4) as card_inclusion_rate,
  round(c.card_win_rate-b.matchup_win_rate,4) as win_rate_delta
from card_stats c join baseline b using(archetype_id,opponent_archetype_id)
where b.matchup_games>=greatest(1,p_min_matchup_games) and c.card_games>=greatest(1,p_min_card_games)
order by c.archetype_id,c.opponent_archetype_id,abs(c.card_win_rate-b.matchup_win_rate) desc,c.card_games desc;
$$;
revoke all on function public.get_matchup_card_evidence(text[],timestamptz,integer,integer) from public;
grant execute on function public.get_matchup_card_evidence(text[],timestamptz,integer,integer) to service_role;
