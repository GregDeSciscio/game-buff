-- TABLE SETUP --
create table profiles (
  id uuid references auth.users not null primary key,
  username text,
  total_xp bigint default 0,
  current_level int default 1
);

create table loadouts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) not null,
  game_title text not null,
  triggers jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) not null,
  loadout_id uuid references loadouts(id),
  total_xp_gained int default 0,
  duration_seconds int default 0,
  log_summary jsonb,
  played_at timestamp with time zone default timezone('utc'::text, now())
);

-- ROW LEVEL SECURITY POLICIES --
alter table profiles enable row level security;
alter table loadouts enable row level security;
alter table sessions enable row level security;

-- Profiles
create policy "Users can see own data" on profiles for select using (auth.uid() = id);
create policy "Users can update own data" on profiles for update using (auth.uid() = id);

-- Loadouts
create policy "Users can see own loadouts" on loadouts for select using (auth.uid() = user_id);
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

-- FUNCTIONS & TRIGGERS --
create or replace function finish_session(p_loadout_id uuid, p_xp_gained int, p_duration int, p_log jsonb) returns void as $$
begin
  insert into sessions (user_id, loadout_id, total_xp_gained, duration_seconds, log_summary)
  values (auth.uid(), p_loadout_id, p_xp_gained, p_duration, p_log);
  update profiles set total_xp = total_xp + p_xp_gained where id = auth.uid();
end;
$$ language plpgsql security definer;

create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, username) values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
