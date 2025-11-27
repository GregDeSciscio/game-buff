-- Seed data for Game Buff
-- Usage (psql example):
--   psql "<your_supabase_connection_string>" -f supabase_seed.sql
--
-- Replace these UUIDs with real auth.user IDs from Supabase Auth
\set u1 '11111111-1111-1111-1111-111111111111'
\set u2 '22222222-2222-2222-2222-222222222222'
\set u3 '33333333-3333-3333-3333-333333333333'
-- Optional service/preset owner (can be a service account or one of the above)
\set preset_owner '00000000-0000-0000-0000-000000000000'

-- Profiles
insert into profiles (id, username, display_name, total_xp, current_level)
values
  (:u1, 'player_one', 'Player One', 4200, 5),
  (:u2, 'player_two', 'Player Two', 2750, 4),
  (:u3, 'player_three', 'Player Three', 1350, 3)
on conflict (id) do update
  set username = excluded.username,
      display_name = excluded.display_name,
      total_xp = excluded.total_xp,
      current_level = excluded.current_level;

-- Loadouts (mix of private/public/preset)
insert into loadouts (user_id, game_title, triggers, visibility, source_loadout_id)
values
  (:u1, 'Apex Legends', '[{"id":1,"label":"Knocked","exercise":"Pushups","amount":10,"type":"reps","color":"bg-red-600"},{"id":2,"label":"Win","exercise":"Burpees","amount":15,"type":"reps","color":"bg-blue-600"}]'::jsonb, 'private', null),
  (:u1, 'Valorant', '[{"id":1,"label":"Death","exercise":"Squats","amount":12,"type":"reps","color":"bg-purple-600"},{"id":2,"label":"Ace","exercise":"Plank","amount":45,"type":"timer","color":"bg-green-600"}]'::jsonb, 'public', null),
  (:u2, 'Call of Duty', '[{"id":1,"label":"Death","exercise":"Pushups","amount":15,"type":"reps","color":"bg-orange-600"},{"id":2,"label":"Win","exercise":"Lunges","amount":20,"type":"reps","color":"bg-blue-600"}]'::jsonb, 'public', null),
  (:u3, 'Fortnite', '[{"id":1,"label":"Elim","exercise":"Jumping Jacks","amount":20,"type":"reps","color":"bg-emerald-600"},{"id":2,"label":"Victory","exercise":"Plank","amount":60,"type":"timer","color":"bg-red-600"}]'::jsonb, 'private', null),
  (:preset_owner, 'Overwatch 2', '[{"id":1,"label":"Death","exercise":"Pushups","amount":10,"type":"reps","color":"bg-red-600"},{"id":2,"label":"Win","exercise":"Situps","amount":20,"type":"reps","color":"bg-blue-600"}]'::jsonb, 'preset', null),
  (:preset_owner, 'Halo Infinite', '[{"id":1,"label":"Death","exercise":"Squats","amount":12,"type":"reps","color":"bg-purple-600"},{"id":2,"label":"Flag Capture","exercise":"Burpees","amount":10,"type":"reps","color":"bg-orange-600"}]'::jsonb, 'preset', null)
on conflict do nothing;

-- Sessions (simple history)
insert into sessions (user_id, loadout_id, total_xp_gained, duration_seconds, log_summary)
select :u1, id, 300, 1800, '[{"message":"+150 XP (Pushups)","xp":150,"type":"reps","amount":15,"exercise":"Pushups"}]'::jsonb
from loadouts where user_id = :u1
union all
select :u2, id, 220, 1500, '[{"message":"+120 XP (Squats)","xp":120,"type":"reps","amount":12,"exercise":"Squats"}]'::jsonb
from loadouts where user_id = :u2
union all
select :u3, id, 180, 1200, '[{"message":"+100 XP (Jumping Jacks)","xp":100,"type":"reps","amount":20,"exercise":"Jumping Jacks"}]'::jsonb
from loadouts where user_id = :u3
on conflict do nothing;

-- Friends (accepted)
insert into friends (requester_id, addressee_id, status)
values
  (:u1, :u2, 'accepted'),
  (:u1, :u3, 'accepted'),
  (:u2, :u3, 'accepted')
on conflict do nothing;

-- Make sure public/preset policy exists
drop policy if exists "Anyone can see public/preset loadouts" on loadouts;
create policy "Anyone can see public/preset loadouts"
  on loadouts
  for select
  using (visibility in ('public','preset'));
