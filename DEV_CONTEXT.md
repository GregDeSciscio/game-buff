# 🛠️ Game Buff - Development Context

## 0. Development Protocols (Read First)
1.  **Context Awareness:** Always read this file before generating code to ensure consistency with the stack and database schema.
2.  **Changelog Updates:** **CRITICAL:** Upon completing any major feature or bug fix, you MUST append a line to the **Changelog** section below summarizing the change.
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
- **Active Session:** Working (Live timer, large buttons, audio cues pending).
- **History:** Working (View past sessions + XP gained).
- **Database:** RLS policies set for Select, Insert, and Update.

## 4. Database Schema (Snapshot)
- **profiles:** `id` (auth link), `username`, `total_xp`, `current_level`
- **loadouts:** `id`, `user_id`, `game_title`, `triggers` (JSONB Array)
- **sessions:** `id`, `user_id`, `loadout_id`, `total_xp_gained`, `duration_seconds`, `log_summary` (JSONB)

## 5. Changelog
- **[Latest] Added Sound FX:** Web Audio click cues on buttons and timer completion chime in GameBuffSession.
- **[Latest] Added PWA Manifest:** Added `manifest.webmanifest`, install icons, and head tags for Add to Home Screen compatibility.
- **[Latest] Fixed RLS Update Policy:** Added policy to allow `UPDATE` on loadouts table so edits persist.
- **Added Edit Functionality:** Refactored `CreateLoadout` to handle `id` param for editing.
- **Added History:** Created `History.jsx` and updated Dashboard to link to it.
- **Added SPA Routing:** Added `vercel.json` to fix 404s on refresh.
- **Added Timer Logic:** Smart detection of time-based exercises (e.g., Plank) triggers a countdown modal.

## 6. Immediate Roadmap (Next Steps)
1.  **Biometrics:** Add Height/Weight to profile for Calorie estimation.
2.  **Sound Effects:** Add audio feedback for button presses and timer completion.
3.  **PWA Manifest:** Configure `manifest.json` for "Add to Home Screen" capability.
