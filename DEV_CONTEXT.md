# 🛠️ Game Buff - Development Context

## 0. Development Protocols (Read First)
1.  **Context Awareness:** Always read this file before generating code to ensure consistency with the stack and database schema.
2.  **Changelog Updates:** **CRITICAL:** Upon completing any major feature or bug fix, you MUST append a line to the **Changelog** section below summarizing the change. Include a timestamp and update the **Immediate Roadmap** section if needed.
3.  **Schema Accuracy:** If you alter the database (SQL), update the **Database Schema** section to reflect the new structure immediately.

## 1. Project Brief
**App Name:** Game Buff
**Type:** Mobile-first Web App (PWA)
**Goal:** Gamify fitness by allowing gamers to define workout triggers based on in-game events (e.g., "10 Pushups on Death").
**Stack:**
- **Frontend:** React + Vite
- **Styling:** Tailwind CSS (Slate-900 Dark Mode theme)
- **Backend:** Supabase (PostgreSQL + Auth + Row Level Security)
- **Deployment:** Vercel

## 2. Core Logic & Rules
- **XP Algorithm:**
  - Reps: 1 Rep = 10 XP
  - Time: 1 Sec = 5 XP
  - Multipliers: Tiered system (e.g., Pullups = 3x, Jumping Jacks = 1x).
- **Session Logic:** Users do NOT need to save after every set. Data is stored locally in state and pushed to Supabase via RPC (`finish_session`) only when "End Session" is clicked.
- **Routing:** SPA architecture. `vercel.json` handles rewrites to `/index.html`.

## 3. Current Status (As of Nov 2025)
- **Authentication:** Working (Email/Pass via Supabase).
- **Dashboard:** Displays User Level, XP Progress, and Loadouts.
- **Create Loadout:** Working (Supports Reps & Timer logic).
- **Edit Loadout:** Working (Updates existing records).
- **Active Session:** Working (Live timer, large buttons).
- **History:** Working (View past sessions + XP gained).
- **Database:** RLS policies set for Select, Insert, and Update.

## 4. Database Schema (Snapshot)
- **profiles:** `id` (auth link), `username`, `display_name`, `total_xp`, `current_level`, `height_cm`, `weight_kg`
- **loadouts:** `id`, `user_id`, `game_title`, `triggers` (JSONB Array), `visibility` (private/public/preset), `source_loadout_id`
- **sessions:** `id`, `user_id`, `loadout_id`, `total_xp_gained`, `duration_seconds`, `calories_burned`, `log_summary` (JSONB)
- **friends:** `id`, `requester_id`, `addressee_id`, `status` (pending/accepted/blocked), `created_at`

## 5. Changelog
- **[Latest] Animated Exercise Previews:** Session triggers can show animated cues per exercise (toggleable); centralized calories helper retained.
- **Hide Presets in My Loadouts:** Dashboard excludes preset visibility so users aren't stuck with non-removable presets; manage presets via Explore instead.
- **Shared Calories Helper:** Centralized MET-based calories calculation; used in session logging and explore previews for consistent kcal/XP estimates.
- **Seed Data Script:** Added `supabase_seed.sql` to insert sample users/profiles/loadouts/sessions/friends (requires real auth user IDs).
- **[Latest] Explore Page:** Added `/explore` with Presets/Community tabs; bottom nav includes Explore link.
- **Share & Attribution:** Visibility picker clarifies sharing; presets/community section shows attribution and copy badge.
- **Loadout Visibility Badges:** Dashboard shows Private/Public/Preset badges for each loadout.
- **Presets & Community Loadouts:** Added loadout visibility/public share; presets/community picker in Create/Edit; `visibility` and `source_loadout_id` columns added with public/preset select policy.
- **Delete Loadout:** Edit screen has a delete button (now visible above bottom nav) with confirmation for removing a game/loadout.
- **Nav Icon Update:** Games tab now uses a gamepad icon in the global bottom nav.
- **Friends UX:** Added `/friends` screen for requests, sent, friends, and add-by-search; dashboard link.
- **Display Name + Leaderboards:** Profiles now support public `display_name`; leaderboards show display names (fallback to username).
- **Leaderboards (Global/Friends) + Friends Schema:** Added friends table + RLS, new `/leaderboard` screen with global and friends tabs, dashboard link.
- **Profile Height/Weight (US UI):** Profile screen accepts ft/in and lbs (stored as cm/kg).
- **Post-session Redirect:** Ending a session returns to the game detail page instead of dashboard.
- **Detailed Activity:** Game page shows top exercises (today & last 7 days) alongside rep totals.
- **Streamlined Session UI:** Auto-start on first tap; hide play/pause and timer modal for rep-only loadouts.
- **Dashboard Controls:** Play button goes straight to session; added view icon for game details.
- **Game-level Session Purge:** `/game/:id` supports deleting all sessions with XP rollback and warning.
- **Session Deletion Fix:** Subtract XP only after successful delete; added sessions delete RLS policy.
- **Enhanced Game Page Detail:** Added per-exercise breakdown and timeframe filter on `/game/:id`.
- **Game Page & Activity Stats:** `/game/:id` shows per-game rep totals (today/yesterday/7/30) and recent sessions before starting a session.
- **Added Sound FX:** Web Audio click cues and timer completion chime.
- **PWA Manifest:** Added `manifest.webmanifest`, install icons, and head tags for Add to Home Screen.
- **Loadouts Update Policy:** Added RLS update policy so loadout edits persist.
- **Loadout Edit:** `CreateLoadout` handles `id` param for editing.
- **History Page:** Added `History.jsx` and dashboard link.
- **SPA Routing:** Added `vercel.json` to fix 404s on refresh.
- **Timer Logic:** Smart detection of timer exercises shows countdown modal.

## 6. Immediate Roadmap (Next Steps)
1.  **Biometrics:** Add Height/Weight to profile for Calorie estimation.
