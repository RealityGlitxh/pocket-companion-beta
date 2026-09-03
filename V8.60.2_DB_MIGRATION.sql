-- V8.60.2 — Ranked Match Lifecycle Hardening + Dispute Screenshot Evidence

alter table public.team_ranked_queue
  add column if not exists expires_at timestamptz,
  add column if not exists lifecycle_note text;

update public.team_ranked_queue
set expires_at = coalesce(expires_at, queued_at + interval '10 minutes')
where status='queued';

alter table public.team_ranked_matches
  add column if not exists match_expires_at timestamptz,
  add column if not exists code_expires_at timestamptz,
  add column if not exists abandon_requested_by uuid references auth.users(id) on delete set null,
  add column if not exists abandon_requested_at timestamptz,
  add column if not exists abandon_reason text,
  add column if not exists lifecycle_note text;

update public.team_ranked_matches
set match_expires_at = coalesce(match_expires_at, created_at + interval '30 minutes'),
    code_expires_at = coalesce(code_expires_at, created_at + interval '30 minutes')
where status in ('matched','reported','disputed');

alter table public.team_ranked_disputes
  add column if not exists evidence_deadline_at timestamptz,
  add column if not exists evidence_required boolean not null default true;

update public.team_ranked_disputes
set evidence_deadline_at = coalesce(evidence_deadline_at, created_at + interval '24 hours');

create table if not exists public.team_ranked_dispute_evidence (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references public.team_ranked_disputes(id) on delete cascade,
  match_id uuid not null references public.team_ranked_matches(id) on delete cascade,
  submitted_by uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  file_size integer not null check (file_size > 0 and file_size <= 5242880),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists team_ranked_evidence_dispute_idx on public.team_ranked_dispute_evidence(dispute_id,created_at desc);
create index if not exists team_ranked_evidence_match_idx on public.team_ranked_dispute_evidence(match_id,created_at desc);
create index if not exists team_ranked_evidence_submitter_idx on public.team_ranked_dispute_evidence(submitted_by,created_at desc);

alter table public.team_ranked_dispute_evidence enable row level security;

drop policy if exists team_ranked_evidence_read on public.team_ranked_dispute_evidence;
create policy team_ranked_evidence_read on public.team_ranked_dispute_evidence
for select to authenticated
using (
  submitted_by = (select auth.uid())
  or exists (
    select 1 from public.team_ranked_matches m
    where m.id = team_ranked_dispute_evidence.match_id
      and (select auth.uid()) in (m.player_a_id,m.player_b_id)
  )
  or exists (
    select 1 from public.team_ranked_staff s
    where s.user_id=(select auth.uid()) and s.active
  )
);

drop policy if exists team_ranked_evidence_insert on public.team_ranked_dispute_evidence;
create policy team_ranked_evidence_insert on public.team_ranked_dispute_evidence
for insert to authenticated
with check (
  submitted_by=(select auth.uid())
  and exists (
    select 1 from public.team_ranked_disputes d
    join public.team_ranked_matches m on m.id=d.match_id
    where d.id=team_ranked_dispute_evidence.dispute_id
      and d.match_id=team_ranked_dispute_evidence.match_id
      and d.status in ('open','under_review')
      and now() <= d.evidence_deadline_at
      and (select auth.uid()) in (m.player_a_id,m.player_b_id)
  )
);

drop policy if exists team_ranked_evidence_delete_own on public.team_ranked_dispute_evidence;
create policy team_ranked_evidence_delete_own on public.team_ranked_dispute_evidence
for delete to authenticated
using (
  submitted_by=(select auth.uid())
  and exists (
    select 1 from public.team_ranked_disputes d
    where d.id=team_ranked_dispute_evidence.dispute_id and d.status in ('open','under_review')
  )
);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('team-ranked-evidence','team-ranked-evidence',false,5242880,array['image/png','image/jpeg','image/webp'])
on conflict(id) do update set public=false,file_size_limit=5242880,allowed_mime_types=excluded.allowed_mime_types;

-- Storage path format: <user_id>/<dispute_id>/<random>.<ext>
drop policy if exists team_ranked_evidence_storage_insert on storage.objects;
create policy team_ranked_evidence_storage_insert on storage.objects
for insert to authenticated
with check (
  bucket_id='team-ranked-evidence'
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and exists (
    select 1 from public.team_ranked_disputes d
    join public.team_ranked_matches m on m.id=d.match_id
    where d.id::text=(storage.foldername(name))[2]
      and d.status in ('open','under_review')
      and now() <= d.evidence_deadline_at
      and (select auth.uid()) in (m.player_a_id,m.player_b_id)
  )
);

drop policy if exists team_ranked_evidence_storage_select on storage.objects;
create policy team_ranked_evidence_storage_select on storage.objects
for select to authenticated
using (
  bucket_id='team-ranked-evidence'
  and (
    owner_id=(select auth.uid())::text
    or exists (
      select 1 from public.team_ranked_disputes d
      join public.team_ranked_matches m on m.id=d.match_id
      where d.id::text=(storage.foldername(name))[2]
        and (select auth.uid()) in (m.player_a_id,m.player_b_id)
    )
    or exists (
      select 1 from public.team_ranked_staff s where s.user_id=(select auth.uid()) and s.active
    )
  )
);

drop policy if exists team_ranked_evidence_storage_delete on storage.objects;
create policy team_ranked_evidence_storage_delete on storage.objects
for delete to authenticated
using (
  bucket_id='team-ranked-evidence'
  and owner_id=(select auth.uid())::text
  and exists (
    select 1 from public.team_ranked_disputes d
    where d.id::text=(storage.foldername(name))[2] and d.status in ('open','under_review')
  )
);

create or replace function public.cleanup_team_ranked_lifecycle()
returns jsonb
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  v_uid uuid:=auth.uid();
  v_queue_count int:=0;
  v_match_count int:=0;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;

  delete from public.team_ranked_queue
  where status='queued' and coalesce(expires_at,queued_at+interval '10 minutes') < now();
  get diagnostics v_queue_count = row_count;

  update public.team_ranked_matches
  set status='expired',
      settled_at=now(),
      team_a_rating_after=team_a_rating_before,
      team_b_rating_after=team_b_rating_before,
      lifecycle_note='Expired without a verified result.'
  where status in ('matched','reported')
    and coalesce(match_expires_at,created_at+interval '30 minutes') < now();
  get diagnostics v_match_count = row_count;

  delete from public.team_ranked_queue q
  using public.team_ranked_matches m
  where q.matched_match_id=m.id and m.status in ('expired','cancelled','abandoned','completed');

  return jsonb_build_object('stale_queues_removed',v_queue_count,'matches_expired',v_match_count);
end $$;

revoke all on function public.cleanup_team_ranked_lifecycle() from public,anon;
grant execute on function public.cleanup_team_ranked_lifecycle() to authenticated;

create or replace function public.abandon_team_ranked_match(p_match_id uuid,p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  v_uid uuid:=auth.uid();
  m public.team_ranked_matches%rowtype;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into m from public.team_ranked_matches where id=p_match_id for update;
  if m.id is null then raise exception 'Match not found'; end if;
  if v_uid not in (m.player_a_id,m.player_b_id) then raise exception 'You are not a participant in this match'; end if;
  if m.status not in ('matched','reported') then raise exception 'This match cannot be ended without result'; end if;
  if m.player_a_report is not null or m.player_b_report is not null then raise exception 'A result has already been reported. Use the dispute process if reports conflict.'; end if;

  if m.abandon_requested_by is null then
    update public.team_ranked_matches
      set abandon_requested_by=v_uid,abandon_requested_at=now(),abandon_reason=nullif(left(coalesce(p_reason,''),500),''),lifecycle_note='No-result request awaiting opponent confirmation.'
      where id=m.id;
    return jsonb_build_object('status','requested','waiting_for_opponent',true);
  end if;

  if m.abandon_requested_by=v_uid then
    return jsonb_build_object('status','requested','waiting_for_opponent',true);
  end if;

  update public.team_ranked_matches
    set status='abandoned',settled_at=now(),team_a_rating_after=team_a_rating_before,team_b_rating_after=team_b_rating_before,
        lifecycle_note='Both players agreed to end the match with no result.'
    where id=m.id;
  delete from public.team_ranked_queue where user_id in(m.player_a_id,m.player_b_id);
  return jsonb_build_object('status','abandoned','rating_changed',false);
end $$;

revoke all on function public.abandon_team_ranked_match(uuid,text) from public,anon;
grant execute on function public.abandon_team_ranked_match(uuid,text) to authenticated;

create or replace function public.join_team_ranked_queue()
returns jsonb
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
 v_uid uuid:=auth.uid(); v_team_id uuid; v_tag text; v_rating integer; v_season_id uuid; v_season_name text;
 v_candidate public.team_ranked_queue%rowtype; v_match_id uuid; v_code text; v_window integer;
begin
 if v_uid is null then raise exception 'Authentication required'; end if;
 perform public.cleanup_team_ranked_lifecycle();
 select id,name into v_season_id,v_season_name from public.team_ranked_seasons where status='active' and now()>=starts_at and now()<ends_at order by starts_at desc limit 1;
 if v_season_id is null then raise exception 'No active Team Ranked season'; end if;
 select tm.team_id,t.tag into v_team_id,v_tag from public.team_members tm join public.teams t on t.id=tm.team_id where tm.user_id=v_uid and tm.status='active' order by tm.joined_at desc limit 1;
 if v_team_id is null then raise exception 'Join a team before entering ranked Team Wars'; end if;
 insert into public.team_ranked_season_entries(season_id,team_id,rating_points,peak_rating) values(v_season_id,v_team_id,1500,1500) on conflict(season_id,team_id) do nothing;
 select rating_points into v_rating from public.team_ranked_season_entries where season_id=v_season_id and team_id=v_team_id;
 update public.teams set rating_points=v_rating where id=v_team_id;
 insert into public.team_ranked_queue(user_id,team_id,team_tag,rating_snapshot,status,matched_match_id,queued_at,updated_at,season_id,expires_at,lifecycle_note)
 values(v_uid,v_team_id,v_tag,v_rating,'queued',null,now(),now(),v_season_id,now()+interval '10 minutes','Queue expires automatically after 10 minutes.')
 on conflict(user_id) do update set team_id=excluded.team_id,team_tag=excluded.team_tag,rating_snapshot=excluded.rating_snapshot,status='queued',matched_match_id=null,queued_at=now(),updated_at=now(),season_id=excluded.season_id,expires_at=excluded.expires_at,lifecycle_note=excluded.lifecycle_note;
 v_window:=75;
 select q.* into v_candidate from public.team_ranked_queue q
 where q.status='queued' and q.season_id=v_season_id and q.user_id<>v_uid and q.team_id<>v_team_id and lower(q.team_tag)<>lower(v_tag)
 and coalesce(q.expires_at,q.queued_at+interval '10 minutes')>now()
 and abs(q.rating_snapshot-v_rating)<=greatest(v_window,least(300,75+floor(extract(epoch from(now()-q.queued_at))/15)::int*50))
 order by abs(q.rating_snapshot-v_rating),q.queued_at for update skip locked limit 1;
 if v_candidate.user_id is null then return jsonb_build_object('status','queued','season_id',v_season_id,'season_name',v_season_name,'team_id',v_team_id,'team_tag',v_tag,'rating',v_rating,'same_tag_blocked',true,'expires_at',now()+interval '10 minutes'); end if;
 loop v_code:=upper(substr(md5(random()::text||clock_timestamp()::text||v_uid::text),1,8)); exit when not exists(select 1 from public.team_ranked_matches where private_code=v_code and coalesce(code_expires_at,created_at+interval '30 minutes')>now()); end loop;
 insert into public.team_ranked_matches(player_a_id,player_b_id,team_a_id,team_b_id,team_a_tag,team_b_tag,team_a_rating_before,team_b_rating_before,private_code,season_id,match_expires_at,code_expires_at,lifecycle_note)
 values(v_candidate.user_id,v_uid,v_candidate.team_id,v_team_id,v_candidate.team_tag,v_tag,v_candidate.rating_snapshot,v_rating,v_code,v_season_id,now()+interval '30 minutes',now()+interval '30 minutes','Private code and match expire after 30 minutes without a verified result.') returning id into v_match_id;
 update public.team_ranked_queue set status='matched',matched_match_id=v_match_id,updated_at=now(),expires_at=null where user_id in(v_candidate.user_id,v_uid);
 return jsonb_build_object('status','matched','season_id',v_season_id,'season_name',v_season_name,'match_id',v_match_id,'private_code',v_code,'opponent_team_id',v_candidate.team_id,'opponent_tag',v_candidate.team_tag,'opponent_rating',v_candidate.rating_snapshot,'same_tag_blocked',true,'match_expires_at',now()+interval '30 minutes');
end $$;

revoke all on function public.join_team_ranked_queue() from public,anon;
grant execute on function public.join_team_ranked_queue() to authenticated;

create or replace function public.report_team_ranked_result(p_match_id uuid, p_result text)
returns jsonb
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
 v_uid uuid:=auth.uid(); m public.team_ranked_matches%rowtype; v_a text; v_b text; v_winner uuid; v_loser uuid; v_delta integer; v_win_before integer; v_lose_before integer; v_win_after integer; v_lose_after integer;
begin
 if v_uid is null then raise exception 'Authentication required'; end if;
 if p_result not in('win','loss') then raise exception 'Result must be win or loss'; end if;
 select * into m from public.team_ranked_matches where id=p_match_id for update;
 if m.id is null then raise exception 'Match not found'; end if;
 if v_uid<>m.player_a_id and v_uid<>m.player_b_id then raise exception 'You are not a participant in this match'; end if;
 if m.status in('completed','cancelled','expired','abandoned') then return jsonb_build_object('status',m.status,'rating_delta',m.rating_delta); end if;
 if coalesce(m.match_expires_at,m.created_at+interval '30 minutes') < now() then
   update public.team_ranked_matches set status='expired',settled_at=now(),team_a_rating_after=team_a_rating_before,team_b_rating_after=team_b_rating_before,lifecycle_note='Expired before result confirmation.' where id=m.id;
   delete from public.team_ranked_queue where user_id in(m.player_a_id,m.player_b_id);
   return jsonb_build_object('status','expired','rating_changed',false);
 end if;
 if v_uid=m.player_a_id then update public.team_ranked_matches set player_a_report=p_result,status='reported' where id=m.id; else update public.team_ranked_matches set player_b_report=p_result,status='reported' where id=m.id; end if;
 select player_a_report,player_b_report into v_a,v_b from public.team_ranked_matches where id=m.id;
 if v_a is null or v_b is null then return jsonb_build_object('status','reported','waiting_for_opponent',true); end if;
 if v_a=v_b then update public.team_ranked_matches set status='disputed' where id=m.id; return jsonb_build_object('status','disputed','rating_changed',false); end if;
 if m.season_id is null then raise exception 'This match is not attached to a ranked season'; end if;
 if v_a='win' then v_winner:=m.team_a_id;v_loser:=m.team_b_id;else v_winner:=m.team_b_id;v_loser:=m.team_a_id;end if;
 v_delta:=m.rating_delta;
 insert into public.team_ranked_season_entries(season_id,team_id) values(m.season_id,m.team_a_id),(m.season_id,m.team_b_id) on conflict do nothing;
 select rating_points into v_win_before from public.team_ranked_season_entries where season_id=m.season_id and team_id=v_winner for update;
 select rating_points into v_lose_before from public.team_ranked_season_entries where season_id=m.season_id and team_id=v_loser for update;
 v_win_after:=v_win_before+v_delta; v_lose_after:=greatest(0,v_lose_before-v_delta);
 update public.team_ranked_season_entries set rating_points=v_win_after,peak_rating=greatest(peak_rating,v_win_after),wins=wins+1,matches_played=matches_played+1,updated_at=now() where season_id=m.season_id and team_id=v_winner;
 update public.team_ranked_season_entries set rating_points=v_lose_after,losses=losses+1,matches_played=matches_played+1,updated_at=now() where season_id=m.season_id and team_id=v_loser;
 update public.teams set rating_points=v_win_after,ranked_wins=ranked_wins+1 where id=v_winner;
 update public.teams set rating_points=v_lose_after,ranked_losses=ranked_losses+1 where id=v_loser;
 update public.team_ranked_matches set status='completed',winner_team_id=v_winner,settled_at=now(),team_a_rating_after=case when team_a_id=v_winner then v_win_after else v_lose_after end,team_b_rating_after=case when team_b_id=v_winner then v_win_after else v_lose_after end where id=m.id;
 insert into public.team_ranked_rating_history(season_id,match_id,team_id,rating_before,rating_after,delta) values(m.season_id,m.id,v_winner,v_win_before,v_win_after,v_win_after-v_win_before),(m.season_id,m.id,v_loser,v_lose_before,v_lose_after,v_lose_after-v_lose_before) on conflict do nothing;
 delete from public.team_ranked_queue where user_id in(m.player_a_id,m.player_b_id);
 return jsonb_build_object('status','completed','winner_team_id',v_winner,'rating_delta',v_delta,'rating_changed',true,'winner_rating',v_win_after,'loser_rating',v_lose_after,'season_id',m.season_id);
end $$;

revoke all on function public.report_team_ranked_result(uuid,text) from public,anon;
grant execute on function public.report_team_ranked_result(uuid,text) to authenticated;

create or replace function public.open_my_team_ranked_dispute(p_match_id uuid, p_note text default null)
returns public.team_ranked_disputes
language plpgsql
set search_path='public'
as $$
declare m public.team_ranked_matches; d public.team_ranked_disputes;
begin
  select * into m from public.team_ranked_matches where id=p_match_id;
  if m.id is null then raise exception 'Ranked match not found'; end if;
  if (select auth.uid()) not in (m.player_a_id,m.player_b_id) then raise exception 'You are not a participant in this ranked match'; end if;
  if m.status <> 'disputed' then raise exception 'Only disputed matches can open a dispute case'; end if;
  insert into public.team_ranked_disputes(match_id,season_id,team_a_id,team_b_id,opened_by,player_note,evidence_deadline_at,evidence_required)
  values(m.id,m.season_id,m.team_a_id,m.team_b_id,(select auth.uid()),nullif(trim(p_note),''),now()+interval '24 hours',true)
  on conflict(match_id) do update set player_note=coalesce(excluded.player_note,public.team_ranked_disputes.player_note),evidence_deadline_at=coalesce(public.team_ranked_disputes.evidence_deadline_at,now()+interval '24 hours'),updated_at=now()
  returning * into d;
  return d;
end $$;

grant execute on function public.open_my_team_ranked_dispute(uuid,text) to authenticated;

-- Winner decisions require one screenshot from each actual player. Staff can void if proof is incomplete or unusable.
create or replace function public.resolve_team_ranked_dispute(p_dispute_id uuid, p_resolution text, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  v_uid uuid := auth.uid(); d public.team_ranked_disputes%rowtype; m public.team_ranked_matches%rowtype;
  v_winner uuid; v_loser uuid; v_delta integer; v_win_before integer; v_lose_before integer; v_win_after integer; v_lose_after integer;
  v_event text; v_snapshot jsonb; v_a_evidence int; v_b_evidence int;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not exists(select 1 from public.team_ranked_staff s where s.user_id=v_uid and s.active) then raise exception 'Team Ranked staff access required'; end if;
  if p_resolution not in ('team_a_win','team_b_win','void') then raise exception 'Resolution must be team_a_win, team_b_win, or void'; end if;
  select * into d from public.team_ranked_disputes where id=p_dispute_id for update;
  if d.id is null then raise exception 'Dispute not found'; end if;
  if d.status='resolved' then return jsonb_build_object('status','resolved','resolution',d.resolution,'already_resolved',true); end if;
  select * into m from public.team_ranked_matches where id=d.match_id for update;
  if m.id is null then raise exception 'Ranked match not found'; end if;
  if m.status='completed' then raise exception 'Match is already settled'; end if;
  select count(*) into v_a_evidence from public.team_ranked_dispute_evidence where dispute_id=d.id and submitted_by=m.player_a_id;
  select count(*) into v_b_evidence from public.team_ranked_dispute_evidence where dispute_id=d.id and submitted_by=m.player_b_id;
  if p_resolution<>'void' and d.evidence_required and (v_a_evidence=0 or v_b_evidence=0) then
    raise exception 'Both players must upload at least one screenshot before a winner can be awarded';
  end if;
  v_snapshot := to_jsonb(m) || jsonb_build_object('player_a_evidence_count',v_a_evidence,'player_b_evidence_count',v_b_evidence);
  if p_resolution='void' then
    update public.team_ranked_matches set status='cancelled',winner_team_id=null,settled_at=now(),team_a_rating_after=team_a_rating_before,team_b_rating_after=team_b_rating_before,lifecycle_note='Dispute resolved as void. No RP changed.' where id=m.id;
    delete from public.team_ranked_queue where user_id in (m.player_a_id,m.player_b_id);
    update public.team_ranked_disputes set status='resolved',resolution='void',resolution_note=nullif(left(coalesce(p_note,''),1000),''),resolved_at=now(),resolved_by=v_uid,updated_at=now() where id=d.id;
    insert into public.team_ranked_dispute_events(dispute_id,match_id,actor_user_id,event_type,resolution,note,match_snapshot) values(d.id,m.id,v_uid,'voided','void',nullif(left(coalesce(p_note,''),1000),''),v_snapshot);
    return jsonb_build_object('status','resolved','resolution','void','rating_changed',false,'player_a_evidence',v_a_evidence,'player_b_evidence',v_b_evidence);
  end if;
  if m.season_id is null then raise exception 'This match is not attached to a ranked season'; end if;
  if exists(select 1 from public.team_ranked_rating_history h where h.match_id=m.id) then raise exception 'Rating history already exists for this match'; end if;
  if p_resolution='team_a_win' then v_winner:=m.team_a_id; v_loser:=m.team_b_id; v_event:='resolved_team_a'; else v_winner:=m.team_b_id; v_loser:=m.team_a_id; v_event:='resolved_team_b'; end if;
  v_delta:=m.rating_delta;
  insert into public.team_ranked_season_entries(season_id,team_id) values(m.season_id,m.team_a_id),(m.season_id,m.team_b_id) on conflict do nothing;
  select rating_points into v_win_before from public.team_ranked_season_entries where season_id=m.season_id and team_id=v_winner for update;
  select rating_points into v_lose_before from public.team_ranked_season_entries where season_id=m.season_id and team_id=v_loser for update;
  v_win_after:=v_win_before+v_delta; v_lose_after:=greatest(0,v_lose_before-v_delta);
  update public.team_ranked_season_entries set rating_points=v_win_after,peak_rating=greatest(peak_rating,v_win_after),wins=wins+1,matches_played=matches_played+1,updated_at=now() where season_id=m.season_id and team_id=v_winner;
  update public.team_ranked_season_entries set rating_points=v_lose_after,losses=losses+1,matches_played=matches_played+1,updated_at=now() where season_id=m.season_id and team_id=v_loser;
  update public.teams set rating_points=v_win_after,ranked_wins=ranked_wins+1 where id=v_winner;
  update public.teams set rating_points=v_lose_after,ranked_losses=ranked_losses+1 where id=v_loser;
  update public.team_ranked_matches set status='completed',winner_team_id=v_winner,settled_at=now(),team_a_rating_after=case when team_a_id=v_winner then v_win_after else v_lose_after end,team_b_rating_after=case when team_b_id=v_winner then v_win_after else v_lose_after end,lifecycle_note='Dispute resolved after screenshot evidence review.' where id=m.id;
  insert into public.team_ranked_rating_history(season_id,match_id,team_id,rating_before,rating_after,delta) values(m.season_id,m.id,v_winner,v_win_before,v_win_after,v_win_after-v_win_before),(m.season_id,m.id,v_loser,v_lose_before,v_lose_after,v_lose_after-v_lose_before);
  delete from public.team_ranked_queue where user_id in (m.player_a_id,m.player_b_id);
  update public.team_ranked_disputes set status='resolved',resolution=p_resolution,resolution_note=nullif(left(coalesce(p_note,''),1000),''),resolved_at=now(),resolved_by=v_uid,updated_at=now() where id=d.id;
  insert into public.team_ranked_dispute_events(dispute_id,match_id,actor_user_id,event_type,resolution,note,match_snapshot) values(d.id,m.id,v_uid,v_event,p_resolution,nullif(left(coalesce(p_note,''),1000),''),v_snapshot);
  return jsonb_build_object('status','resolved','resolution',p_resolution,'winner_team_id',v_winner,'rating_delta',v_delta,'rating_changed',true,'winner_rating',v_win_after,'loser_rating',v_lose_after,'player_a_evidence',v_a_evidence,'player_b_evidence',v_b_evidence);
end $$;

revoke all on function public.resolve_team_ranked_dispute(uuid,text,text) from public,anon;
grant execute on function public.resolve_team_ranked_dispute(uuid,text,text) to authenticated;
