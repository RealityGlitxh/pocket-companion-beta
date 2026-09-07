-- PocketNexus V8.64.2 — Pocket Knowledge Engine v1
-- Applied to Supabase production on 2026-09-07.

create table if not exists public.game_knowledge (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('rule','card','set','archetype','meta','rank','tournament','mechanic','update','glossary')),
  entity_key text not null,
  title text not null,
  content text not null,
  source_name text not null default 'PocketNexus',
  source_url text,
  source_updated_at timestamptz,
  confidence text not null default 'verified' check (confidence in ('verified','derived','provisional')),
  metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(content,'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(entity_key,'')), 'A')
  ) stored,
  unique(entity_type, entity_key)
);

create index if not exists game_knowledge_search_idx on public.game_knowledge using gin(search_vector);
create index if not exists game_knowledge_type_active_idx on public.game_knowledge(entity_type, active);
create index if not exists game_knowledge_updated_idx on public.game_knowledge(updated_at desc);

alter table public.game_knowledge enable row level security;
revoke all on public.game_knowledge from anon, authenticated;
grant select on public.game_knowledge to service_role;

create or replace function public.search_game_knowledge(p_query text, p_limit integer default 12)
returns table (
  id uuid,
  entity_type text,
  entity_key text,
  title text,
  content text,
  source_name text,
  source_url text,
  source_updated_at timestamptz,
  confidence text,
  metadata jsonb,
  score real
)
language sql
stable
security invoker
set search_path = public
as $$
  with terms as (
    select distinct regexp_replace(lower(w), '[^a-z0-9]+', '', 'g') as term
    from regexp_split_to_table(coalesce(p_query,''), E'\\s+') as w
    where length(regexp_replace(lower(w), '[^a-z0-9]+', '', 'g')) >= 2
      and regexp_replace(lower(w), '[^a-z0-9]+', '', 'g') not in (
        'what','when','where','which','who','why','how','the','and','for','with','from','this','that','should','would','could','about','into','your','you','are','was','were','have','has','had','does','did','can','all','any','its','his','her','our','their','game','pokemon','pocket','tcg'
      )
  ), q as (
    select case when count(*)=0 then null::tsquery
      else to_tsquery('simple', string_agg(term || ':*', ' | ' order by term)) end as query
    from terms
  )
  select g.id,g.entity_type,g.entity_key,g.title,g.content,g.source_name,g.source_url,g.source_updated_at,g.confidence,g.metadata,
         case when q.query is null then 0::real else ts_rank_cd(g.search_vector,q.query)::real end as score
  from public.game_knowledge g cross join q
  where g.active = true
    and (q.query is null or g.search_vector @@ q.query)
  order by score desc, g.updated_at desc
  limit greatest(1, least(coalesce(p_limit,12), 30));
$$;

revoke all on function public.search_game_knowledge(text, integer) from public;
grant execute on function public.search_game_knowledge(text, integer) to service_role;

insert into public.game_knowledge(entity_type,entity_key,title,content,source_name,confidence,metadata)
values
('rule','deck-size','Deck construction','A Pokémon TCG Pocket deck contains 20 cards. PocketNexus should treat 20 cards as the complete-deck target when analyzing saved decks.','PocketNexus verified rules','verified','{"topic":"deckbuilding"}'::jsonb),
('rule','duplicate-limit','Card copy limit','A normal Pokémon TCG Pocket deck may include at most two cards with the same card name unless a specific game rule or card effect says otherwise.','PocketNexus verified rules','verified','{"topic":"deckbuilding"}'::jsonb),
('rule','win-points','Match victory points','Pokémon TCG Pocket battles are won by reaching the required point total through Knocking Out opposing Pokémon; Pokémon ex give additional points when Knocked Out. Pocket Coach should avoid inventing an exact point interaction when card-specific context is missing.','PocketNexus verified rules','verified','{"topic":"battle"}'::jsonb),
('mechanic','energy-system','Energy system','Pokémon TCG Pocket uses an Energy Zone rather than Energy cards in the deck. Deck analysis should treat selected Energy types separately from the 20-card deck list.','PocketNexus verified rules','verified','{"topic":"battle"}'::jsonb)
on conflict(entity_type,entity_key) do update set title=excluded.title,content=excluded.content,source_name=excluded.source_name,confidence=excluded.confidence,metadata=excluded.metadata,updated_at=now();

insert into public.game_knowledge(entity_type,entity_key,title,content,source_name,source_updated_at,confidence,metadata)
select 'rank', 'threshold:'||id::text, display_name,
       'Rank threshold: '||display_name||' begins at '||min_rp||' RP'||case when max_rp is not null then ' and extends through '||max_rp||' RP.' else '.' end,
       'PocketNexus Rank Database', updated_at, 'verified',
       jsonb_build_object('rank_tier',rank_tier,'rank_level',rank_level,'min_rp',min_rp,'max_rp',max_rp,'is_master_ball',is_master_ball)
from public.rank_thresholds
on conflict(entity_type,entity_key) do update set title=excluded.title,content=excluded.content,source_updated_at=excluded.source_updated_at,metadata=excluded.metadata,updated_at=now();

insert into public.game_knowledge(entity_type,entity_key,title,content,source_name,source_updated_at,confidence,metadata)
select 'archetype', id, name,
       trim(concat_ws(' ',
         'Competitive archetype: '||name||'.',
         case when tier is not null then 'Tier: '||tier||'.' end,
         case when jsonb_array_length(coalesce(pokemon,'[]'::jsonb))>0 then 'Pokémon: '||pokemon::text||'.' end,
         case when jsonb_array_length(coalesce(key_cards,'[]'::jsonb))>0 then 'Key cards: '||key_cards::text||'.' end
       )),
       'PocketNexus Archetype Library', updated_at, 'derived',
       jsonb_build_object('tier',tier,'type',type,'pokemon',pokemon,'key_cards',key_cards,'aliases',aliases)
from public.meta_archetypes
where active=true
on conflict(entity_type,entity_key) do update set title=excluded.title,content=excluded.content,source_updated_at=excluded.source_updated_at,metadata=excluded.metadata,updated_at=now();
