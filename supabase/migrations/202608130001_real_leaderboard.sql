begin;

create extension if not exists pgcrypto;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  opted_into_leaderboard boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (char_length(btrim(display_name)) between 3 and 20),
  constraint profiles_display_name_plain check (
    display_name !~ '[<>]' and
    display_name !~* '(@|https?://|www\.|\.[a-z]{2,}(/|$))' and
    display_name !~ '\+?[0-9][0-9 ()\.-]{6,}[0-9]'
  )
);

create table public.eco_point_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action_type text not null,
  points integer not null,
  source text not null,
  deduplication_key text not null,
  is_self_reported boolean not null default false,
  created_at timestamptz not null default now(),
  unique(user_id, deduplication_key),
  constraint eco_point_events_action_type check (action_type in (
    'compareGreenerAlternative', 'saveLowerImpactOption', 'chooseLowerImpactOption',
    'repairOrReuseItem', 'avoidUnnecessaryPurchase', 'completeWeeklyChallenge'
  )),
  constraint eco_point_events_points check (points in (5, 10, 20, 25, 30)),
  constraint eco_point_events_source check (source in ('web', 'extension', 'web-import', 'extension-import')),
  constraint eco_point_events_deduplication_key check (char_length(deduplication_key) between 3 and 180)
);

create index eco_point_events_user_created_idx on public.eco_point_events(user_id, created_at desc);
create index eco_point_events_rank_idx on public.eco_point_events(created_at, user_id);

create table public.weekly_challenges (
  id text primary key,
  title text not null,
  description text not null,
  reward integer not null default 30 check (reward = 30),
  self_reported boolean not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.weekly_challenges (id, title, description, self_reported) values
  ('repair-reuse', 'Repair or reuse one item', 'Extend the useful life of something you already own.', true),
  ('compare-products', 'Compare before deciding', 'Compare two products and review the disclosed evidence.', false),
  ('pause-purchase', 'Pause one unnecessary purchase', 'Record a mindful decision that you do not need a new item.', true)
on conflict (id) do update set title = excluded.title, description = excluded.description, self_reported = excluded.self_reported;

create table public.user_challenge_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_id text not null references public.weekly_challenges(id),
  period_start date not null,
  event_id uuid not null references public.eco_point_events(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, challenge_id, period_start)
);

create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  import_version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.eco_point_events enable row level security;
alter table public.weekly_challenges enable row level security;
alter table public.user_challenge_completions enable row level security;
alter table public.user_preferences enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated using (user_id = auth.uid());
create policy profiles_insert_own on public.profiles for insert to authenticated with check (user_id = auth.uid());
create policy profiles_update_own on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy events_select_own on public.eco_point_events for select to authenticated using (user_id = auth.uid());
create policy challenge_definitions_read on public.weekly_challenges for select to authenticated using (active);
create policy challenge_completions_select_own on public.user_challenge_completions for select to authenticated using (user_id = auth.uid());
create policy preferences_select_own on public.user_preferences for select to authenticated using (user_id = auth.uid());
create policy preferences_insert_own on public.user_preferences for insert to authenticated with check (user_id = auth.uid());
create policy preferences_update_own on public.user_preferences for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.profiles, public.eco_point_events, public.weekly_challenges, public.user_challenge_completions, public.user_preferences from anon, authenticated;
grant select, insert on public.profiles to authenticated;
grant update (display_name, opted_into_leaderboard, updated_at) on public.profiles to authenticated;
grant select on public.eco_point_events, public.weekly_challenges, public.user_challenge_completions to authenticated;
grant select, insert on public.user_preferences to authenticated;
grant update (import_version, updated_at) on public.user_preferences to authenticated;
grant select on public.profiles, public.eco_point_events, public.weekly_challenges, public.user_challenge_completions, public.user_preferences to service_role;

create or replace function public.koala_level_for_points(p_points bigint)
returns text language sql immutable set search_path = '' as $$
  select case when p_points >= 40 then 'Climate Champion' when p_points >= 15 then 'Eco Explorer' else 'Starter Koala' end;
$$;

create or replace function public.badge_for_user(p_user_id uuid)
returns text language sql stable security definer set search_path = '' as $$
  select case
    when exists(select 1 from public.eco_point_events e where e.user_id = p_user_id and e.action_type = 'repairOrReuseItem') then 'Repair Starter'
    when exists(select 1 from public.eco_point_events e where e.user_id = p_user_id and e.action_type = 'avoidUnnecessaryPurchase') then 'Mindful Pauser'
    when exists(select 1 from public.eco_point_events e where e.user_id = p_user_id and e.action_type = 'compareGreenerAlternative') then 'Thoughtful Comparer'
    else 'New Explorer'
  end;
$$;

create or replace function public.period_start_utc(p_period text)
returns timestamptz language plpgsql stable set search_path = '' as $$
begin
  if p_period = 'week' then return date_trunc('week', now() at time zone 'UTC') at time zone 'UTC'; end if;
  if p_period = 'month' then return date_trunc('month', now() at time zone 'UTC') at time zone 'UTC'; end if;
  if p_period = 'all' then return '1970-01-01 00:00:00+00'::timestamptz; end if;
  raise exception 'invalid_period' using errcode = '22023';
end;
$$;

create or replace function public.get_public_leaderboard(p_period text default 'week')
returns table(public_id text, display_name text, koala_level text, badge text, eco_points bigint, action_count bigint, rank bigint, is_current_user boolean)
language sql stable security definer set search_path = '' as $$
  with totals as (
    select p.user_id, p.display_name,
      coalesce(sum(e.points), 0)::bigint as eco_points,
      count(e.id)::bigint as action_count,
      coalesce(max(e.created_at), p.created_at) as score_reached_at,
      coalesce((select sum(all_e.points) from public.eco_point_events all_e where all_e.user_id = p.user_id), 0)::bigint as all_points
    from public.profiles p
    left join public.eco_point_events e on e.user_id = p.user_id and e.created_at >= public.period_start_utc(p_period)
    where p.opted_into_leaderboard
    group by p.user_id, p.display_name, p.created_at
  ), ranked as (
    select totals.*, row_number() over(order by eco_points desc, action_count desc, score_reached_at asc, user_id asc) as position
    from totals
  )
  select substr(md5(r.user_id::text), 1, 10), r.display_name, public.koala_level_for_points(r.all_points),
    public.badge_for_user(r.user_id), r.eco_points, r.action_count, r.position, r.user_id = auth.uid()
  from ranked r order by r.position;
$$;

create or replace function public.get_my_leaderboard_summary(p_period text default 'week')
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_rank bigint; v_points bigint; v_actions bigint; v_total bigint; v_next bigint;
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  select l.rank, l.eco_points, l.action_count into v_rank, v_points, v_actions from public.get_public_leaderboard(p_period) l where l.is_current_user limit 1;
  select coalesce(sum(points), 0) into v_total from public.eco_point_events where user_id = v_user;
  if v_rank is not null and v_rank > 1 then
    select greatest(0, l.eco_points - v_points + 1) into v_next from public.get_public_leaderboard(p_period) l where l.rank = v_rank - 1;
  else v_next := 0; end if;
  return jsonb_build_object('rank', v_rank, 'periodPoints', coalesce(v_points, 0), 'periodActions', coalesce(v_actions, 0), 'allTimePoints', v_total, 'koalaLevel', public.koala_level_for_points(v_total), 'badge', public.badge_for_user(v_user), 'pointsToNextRank', coalesce(v_next, 0));
end;
$$;

create or replace function public.award_eco_points(p_action_type text, p_deduplication_key text, p_source text, p_metadata jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid(); v_points integer; v_self boolean; v_event_id uuid; v_week timestamptz;
  v_challenge_id text; v_period_start date; v_summary jsonb; v_created_at timestamptz := now();
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_deduplication_key is null or char_length(p_deduplication_key) not between 3 and 180 or p_deduplication_key ~ '[[:cntrl:]<>]' then raise exception 'invalid_deduplication_key' using errcode = '22023'; end if;
  if p_source not in ('web', 'extension', 'web-import', 'extension-import') then raise exception 'invalid_source' using errcode = '22023'; end if;
  if jsonb_typeof(p_metadata) <> 'object' or exists(select 1 from jsonb_object_keys(p_metadata) as key where key not in ('challengeId', 'localTimestamp')) then raise exception 'invalid_metadata' using errcode = '22023'; end if;
  v_points := case p_action_type when 'compareGreenerAlternative' then 5 when 'saveLowerImpactOption' then 5 when 'chooseLowerImpactOption' then 10 when 'repairOrReuseItem' then 20 when 'avoidUnnecessaryPurchase' then 25 when 'completeWeeklyChallenge' then 30 else null end;
  if v_points is null then raise exception 'unknown_action_type' using errcode = '22023'; end if;
  v_self := p_action_type in ('repairOrReuseItem', 'avoidUnnecessaryPurchase', 'completeWeeklyChallenge');
  if p_source in ('web-import', 'extension-import') then
    begin v_created_at := (p_metadata->>'localTimestamp')::timestamptz; exception when others then raise exception 'invalid_import_timestamp' using errcode = '22023'; end;
    if v_created_at > now() + interval '5 minutes' or v_created_at < now() - interval '180 days' then raise exception 'invalid_import_timestamp' using errcode = '22023'; end if;
    if (select count(*) from public.eco_point_events where user_id = v_user and source in ('web-import', 'extension-import')) >= 50 then return jsonb_build_object('status', 'action_limit_reached'); end if;
  end if;
  if exists(select 1 from public.eco_point_events where user_id = v_user and deduplication_key = p_deduplication_key) then return jsonb_build_object('status', 'duplicate_rejected'); end if;
  if (select count(*) from public.eco_point_events where user_id = v_user and created_at >= now() - interval '10 minutes') >= 20 then return jsonb_build_object('status', 'action_limit_reached'); end if;
  if coalesce((select sum(points) from public.eco_point_events where user_id = v_user and created_at >= date_trunc('day', v_created_at at time zone 'UTC') at time zone 'UTC' and created_at < (date_trunc('day', v_created_at at time zone 'UTC') + interval '1 day') at time zone 'UTC'), 0) + v_points > 200 then return jsonb_build_object('status', 'action_limit_reached'); end if;
  v_week := date_trunc('week', v_created_at at time zone 'UTC') at time zone 'UTC';
  if p_action_type = 'repairOrReuseItem' and exists(select 1 from public.eco_point_events where user_id = v_user and action_type = p_action_type and created_at >= v_week) then return jsonb_build_object('status', 'action_limit_reached'); end if;
  if p_action_type = 'avoidUnnecessaryPurchase' and exists(select 1 from public.eco_point_events where user_id = v_user and action_type = p_action_type and created_at >= v_week) then return jsonb_build_object('status', 'action_limit_reached'); end if;
  if p_action_type = 'completeWeeklyChallenge' then
    v_challenge_id := p_metadata->>'challengeId'; v_period_start := v_week::date;
    if v_challenge_id is null or not exists(select 1 from public.weekly_challenges where id = v_challenge_id and active) then raise exception 'invalid_challenge' using errcode = '22023'; end if;
    if exists(select 1 from public.user_challenge_completions where user_id = v_user and challenge_id = v_challenge_id and period_start = v_period_start) then return jsonb_build_object('status', 'duplicate_rejected'); end if;
    if v_challenge_id = 'compare-products' and not exists(select 1 from public.eco_point_events where user_id = v_user and action_type = 'compareGreenerAlternative' and created_at >= v_week) then return jsonb_build_object('status', 'action_limit_reached'); end if;
  end if;
  insert into public.eco_point_events(user_id, action_type, points, source, deduplication_key, is_self_reported, created_at) values(v_user, p_action_type, v_points, p_source, p_deduplication_key, v_self, v_created_at) returning id into v_event_id;
  if p_action_type = 'completeWeeklyChallenge' then insert into public.user_challenge_completions(user_id, challenge_id, period_start, event_id) values(v_user, v_challenge_id, v_period_start, v_event_id); end if;
  update public.profiles set updated_at = now() where user_id = v_user;
  v_summary := public.get_my_leaderboard_summary('week');
  return jsonb_build_object('status', 'synced', 'eventId', v_event_id, 'pointsAwarded', v_points, 'summary', v_summary);
exception when unique_violation then return jsonb_build_object('status', 'duplicate_rejected');
end;
$$;

create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  delete from auth.users where id = v_user;
end;
$$;

revoke all on function public.get_public_leaderboard(text), public.get_my_leaderboard_summary(text), public.award_eco_points(text,text,text,jsonb), public.delete_my_account() from public;
revoke all on function public.koala_level_for_points(bigint), public.badge_for_user(uuid), public.period_start_utc(text) from public, anon, authenticated;
grant execute on function public.get_public_leaderboard(text) to anon, authenticated;
grant execute on function public.get_my_leaderboard_summary(text), public.award_eco_points(text,text,text,jsonb), public.delete_my_account() to authenticated;

commit;
