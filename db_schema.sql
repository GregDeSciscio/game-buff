-- TABLE SETUP --
create table profiles (
  id uuid references auth.users not null primary key,
  username text,
  display_name text,
  total_xp bigint default 0,
  current_level int default 1,
  height_cm numeric,
  weight_kg numeric
);

-- Friends (social graph)
create table friends (
  id uuid default uuid_generate_v4() primary key,
  requester_id uuid not null references profiles(id),
  addressee_id uuid not null references profiles(id),
  status text not null check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create unique index friends_unique_pair on friends (requester_id, addressee_id);

create table loadouts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) not null,
  game_title text not null,
  triggers jsonb not null,
  visibility text not null default 'private' check (visibility in ('private','public','preset')),
  source_loadout_id uuid references loadouts(id),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) not null,
  loadout_id uuid references loadouts(id),
  total_xp_gained int default 0,
  duration_seconds int default 0,
  calories_burned numeric default 0,
  log_summary jsonb,
  played_at timestamp with time zone default timezone('utc'::text, now())
);

-- Streaks and Badges
create table streaks (
  user_id uuid references profiles(id) primary key,
  current_streak int default 0,
  longest_streak int default 0,
  last_session_date date
);

create table badges (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) not null,
  badge_key text not null,
  earned_at timestamptz default timezone('utc'::text, now()),
  constraint badges_user_key_unique unique (user_id, badge_key)
);

-- ROW LEVEL SECURITY POLICIES --
alter table profiles enable row level security;
alter table loadouts enable row level security;
alter table sessions enable row level security;
alter table streaks enable row level security;
alter table badges enable row level security;

-- Profiles
create policy "Users can see own data" on profiles for select using (auth.uid() = id);
create policy "Users can update own data" on profiles for update using (auth.uid() = id);

-- Loadouts
create policy "Users can see own loadouts" on loadouts for select using (auth.uid() = user_id);
create policy "Anyone can see public/preset loadouts" on loadouts for select using (visibility in ('public','preset'));
create policy "Users can create loadouts" on loadouts for insert with check (auth.uid() = user_id);
create policy "Users can delete own loadouts" on loadouts for delete using (auth.uid() = user_id);
-- [ADDED UPDATE POLICY - NOV 2025]
create policy "Users can update own loadouts" on loadouts for update using (auth.uid() = user_id);

-- Sessions
create policy "Users can see own sessions" on sessions for select using (auth.uid() = user_id);
create policy "Users can create sessions" on sessions for insert with check (auth.uid() = user_id);
create policy "Users can delete own sessions" on sessions for delete using (auth.uid() = user_id);
-- [FIX FOR HISTORY JOIN]
alter table sessions drop constraint if exists sessions_loadout_id_fkey, add constraint sessions_loadout_id_fkey foreign key (loadout_id) references loadouts(id) on delete set null;

-- Friends RLS
alter table friends enable row level security;
create policy "Users can view their friendships" on friends for select using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy "Users can request friends" on friends for insert with check (auth.uid() = requester_id);
create policy "Users can update their friendships" on friends for update using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Streaks/Badges RLS
create policy "Users manage own streaks" on streaks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own badges" on badges for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- FUNCTIONS & TRIGGERS --
create or replace function finish_session(p_loadout_id uuid, p_xp_gained int, p_duration int, p_log jsonb, p_calories numeric default 0) returns jsonb as $$
declare
  today date := timezone('utc'::text, now())::date;
  streak_record streaks;
  new_current int;
  new_longest int;
  total_sessions int;
  unlocked text[];
begin
  insert into sessions (user_id, loadout_id, total_xp_gained, duration_seconds, calories_burned, log_summary)
  values (auth.uid(), p_loadout_id, p_xp_gained, p_duration, coalesce(p_calories,0), p_log);
  update profiles set total_xp = total_xp + p_xp_gained where id = auth.uid();

  -- Streaks
  select * into streak_record from streaks where user_id = auth.uid();
  if found then
    if streak_record.last_session_date = today then
      new_current := greatest(streak_record.current_streak, 1);
    elsif streak_record.last_session_date = (today - 1) then
      new_current := streak_record.current_streak + 1;
    else
      new_current := 1;
    end if;
    new_longest := greatest(streak_record.longest_streak, new_current);
    update streaks
      set current_streak = new_current,
          longest_streak = new_longest,
          last_session_date = today
      where user_id = auth.uid();
  else
    new_current := 1;
    new_longest := 1;
    insert into streaks (user_id, current_streak, longest_streak, last_session_date)
    values (auth.uid(), new_current, new_longest, today);
  end if;

  -- Badges (session-count and streak milestones)
  select count(*) into total_sessions from sessions where user_id = auth.uid();

  if total_sessions >= 10 then
    insert into badges (user_id, badge_key) values (auth.uid(), 'sessions_10')
    on conflict (user_id, badge_key) do nothing;
    unlocked := array_append(unlocked, 'sessions_10');
  end if;
  if total_sessions >= 25 then
    insert into badges (user_id, badge_key) values (auth.uid(), 'sessions_25')
    on conflict (user_id, badge_key) do nothing;
    unlocked := array_append(unlocked, 'sessions_25');
  end if;
  if total_sessions >= 50 then
    insert into badges (user_id, badge_key) values (auth.uid(), 'sessions_50')
    on conflict (user_id, badge_key) do nothing;
    unlocked := array_append(unlocked, 'sessions_50');
  end if;

  if new_longest >= 7 then
    insert into badges (user_id, badge_key) values (auth.uid(), 'streak_7')
    on conflict (user_id, badge_key) do nothing;
    unlocked := array_append(unlocked, 'streak_7');
  end if;
  return jsonb_build_object('unlocked_badges', unlocked);
end;
$$ language plpgsql security definer;

create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, username) values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
