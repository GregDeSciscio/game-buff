# Game Buff 🎮💪

**Level up in real life.**

Game Buff is a mobile-first web application that bridges the gap between gaming and fitness. It allows users to define custom workout routines triggered by in-game events (e.g., "Do 10 pushups when I die in Elden Ring" or "Plank for 60s when waiting for a match lobby").

## 🚀 Features

* **Custom Loadouts:** Create "Rule Sets" for specific games (Triggers → Exercises).
* **Active Session Mode:** A high-contrast, "Thumb Zone" optimized interface for logging reps without interrupting gameplay.
* **Smart Timers:** Automatic countdown overlays for duration-based exercises (Planks, Wall Sits).
* **Gamification Engine:** Custom XP algorithm that normalizes difficulty (Time vs. Reps) to reward users with Levels.
* **History & Analytics:** Detailed logs of every session stored securely in the cloud.

## 🛠️ Tech Stack

* **Frontend:** React (Vite)
* **Styling:** Tailwind CSS (Mobile-first, Dark Mode)
* **Backend:** Supabase (PostgreSQL)
* **Auth:** Supabase Auth (Email/Password)
* **Icons:** Lucide React

## ⚙️ Getting Started

### 1. Clone & Install

```bash
git clone [https://github.com/yourusername/game-buff.git](https://github.com/yourusername/game-buff.git)
cd game-buff
npm install
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Database Setup (Supabase)

This project uses Supabase for Auth and Database. Run the following SQL in your Supabase SQL Editor to set up the Schema and Security Policies:

```sql
-- 1. Create Tables
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

-- 2. Enable RLS (Security)
alter table profiles enable row level security;
alter table loadouts enable row level security;
alter table sessions enable row level security;

-- 3. Policies
create policy "Users can see own data" on profiles for select using (auth.uid() = id);
create policy "Users can update own data" on profiles for update using (auth.uid() = id);

create policy "Users can see own loadouts" on loadouts for select using (auth.uid() = user_id);
create policy "Users can create loadouts" on loadouts for insert with check (auth.uid() = user_id);

create policy "Users can see own sessions" on sessions for select using (auth.uid() = user_id);
create policy "Users can create sessions" on sessions for insert with check (auth.uid() = user_id);

-- 4. Atomic Session Logic (RPC Function)
create or replace function finish_session(
  p_loadout_id uuid,
  p_xp_gained int,
  p_duration int,
  p_log jsonb
)
returns void as $$
begin
  -- Insert the session
  insert into sessions (user_id, loadout_id, total_xp_gained, duration_seconds, log_summary)
  values (auth.uid(), p_loadout_id, p_xp_gained, p_duration, p_log);

  -- Update the profile XP
  update profiles
  set total_xp = total_xp + p_xp_gained
  where id = auth.uid();
end;
$$ language plpgsql security definer;

-- 5. Auto-create Profile on Signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### 4. Run Locally

```bash
npm run dev
```

## 🧠 Design Decisions

### The "Buff Algorithm"
To ensure fairness between different exercise types, the app uses a normalized XP system:
* **Reps:** 1 Rep = 10 Base XP.
* **Time:** 1 Second = 5 Base XP.
* **Multipliers:** Exercises are tiered (e.g., Pull-ups = 3.0x multiplier, Jumping Jacks = 1.0x).

### Mobile-First UI
The "Active Session" screen utilizes large hit-boxes and high-contrast colors (Neon on Dark Slate). This design pattern accounts for the user's divided attention—allowing them to tap a log button blindly while keeping their eyes on their game monitor.

## 🔮 Future Roadmap

- [ ] **Leaderboards:** Compare XP with friends.
- [ ] **Sound Effects:** 8-bit audio cues for "Level Up" and "Timer Complete."
- [ ] **PWA Support:** Installable on iOS/Android home screens.
- [ ] **Preset Library:** "Community Loadouts" for popular games (e.g., Warzone, League of Legends).