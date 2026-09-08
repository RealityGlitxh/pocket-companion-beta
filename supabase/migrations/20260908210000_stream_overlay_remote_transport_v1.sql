create extension if not exists pgcrypto;

create table if not exists public.stream_overlay_sessions (
  overlay_id uuid primary key default gen_random_uuid(),
  write_token_hash bytea not null,
  user_id uuid null references auth.users(id) on delete set null,
  state jsonb not null default '{}'::jsonb,
  revoked_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.stream_overlay_sessions enable row level security;
revoke all on table public.stream_overlay_sessions from anon, authenticated;

create or replace function public.stream_overlay_sanitize(p_state jsonb)
returns jsonb
language sql
immutable
set search_path = public, pg_temp
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'modes', p_state->'modes',
    'activeMode', p_state->'activeMode',
    'version', p_state->'version'
  ));
$$;

create or replace function public.create_stream_overlay(p_state jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid := gen_random_uuid();
  v_token text := encode(gen_random_bytes(32), 'hex');
  v_uid uuid := auth.uid();
begin
  insert into public.stream_overlay_sessions(overlay_id, write_token_hash, user_id, state)
  values (v_id, digest(v_token, 'sha256'), v_uid, public.stream_overlay_sanitize(coalesce(p_state, '{}'::jsonb)));
  return jsonb_build_object('overlay_id', v_id, 'write_token', v_token, 'updated_at', now());
end;
$$;

create or replace function public.publish_stream_overlay(p_overlay_id uuid, p_write_token text, p_state jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.stream_overlay_sessions%rowtype;
begin
  select * into v_row from public.stream_overlay_sessions where overlay_id = p_overlay_id;
  if not found or v_row.revoked_at is not null then
    return jsonb_build_object('ok', false, 'status', 'invalid');
  end if;
  if v_row.write_token_hash <> digest(coalesce(p_write_token,''), 'sha256') then
    return jsonb_build_object('ok', false, 'status', 'forbidden');
  end if;
  update public.stream_overlay_sessions
     set state = public.stream_overlay_sanitize(coalesce(p_state, '{}'::jsonb)), updated_at = now()
   where overlay_id = p_overlay_id;
  return jsonb_build_object('ok', true, 'status', 'ok', 'updated_at', now());
end;
$$;

create or replace function public.read_stream_overlay(p_overlay_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_row public.stream_overlay_sessions%rowtype;
begin
  select * into v_row from public.stream_overlay_sessions where overlay_id = p_overlay_id;
  if not found then return jsonb_build_object('status','invalid'); end if;
  if v_row.revoked_at is not null then return jsonb_build_object('status','revoked'); end if;
  return jsonb_build_object('status','ok','state',v_row.state,'updated_at',v_row.updated_at);
end;
$$;

create or replace function public.revoke_stream_overlay(p_overlay_id uuid, p_write_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.stream_overlay_sessions%rowtype;
begin
  select * into v_row from public.stream_overlay_sessions where overlay_id = p_overlay_id;
  if not found then return jsonb_build_object('ok',false,'status','invalid'); end if;
  if v_row.write_token_hash <> digest(coalesce(p_write_token,''), 'sha256') then
    return jsonb_build_object('ok',false,'status','forbidden');
  end if;
  update public.stream_overlay_sessions set revoked_at=now(), updated_at=now() where overlay_id=p_overlay_id;
  return jsonb_build_object('ok',true,'status','revoked');
end;
$$;

grant execute on function public.create_stream_overlay(jsonb) to anon, authenticated;
grant execute on function public.publish_stream_overlay(uuid,text,jsonb) to anon, authenticated;
grant execute on function public.read_stream_overlay(uuid) to anon, authenticated;
grant execute on function public.revoke_stream_overlay(uuid,text) to anon, authenticated;
