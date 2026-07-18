Original prompt: Do it

Goal: Implement the prioritized Game Buff design improvements from the preceding design review.

## Progress
- Started by auditing the existing dirty worktree so current user changes remain intact.
- Added accessible four-item navigation and shared focus, surface, segmented-control, and field primitives.
- Production build passes. The required Playwright client needed elevated Chromium launch; its first visual capture confirmed the login layout still renders correctly.
- Added remembered quick-start behavior and larger accessible actions on the dashboard.
- Rebuilt active sessions as a distraction-free mode with a two-column mobile action grid, compact live stats, undo, and a designed exit confirmation.
- Converted loadout creation/editing into a three-step Game → Workout → Triggers flow with live trigger sentences and labeled color controls.
- Extended the page shell, headers, and segmented-control language across Activity, Discover, Friends, Leaderboards, Profile, and game detail screens.
- Verified desktop screenshots for login, session, and builder. Verified the session and builder at 390×844, including log → +200 XP/+10 reps → undo → zero-state restoration. The interactive browser console check returned no errors; the standalone mocked preview only reported the expected blocked Supabase network request.
- Final production build and required Playwright smoke capture passed.

## TODO
- Consider replacing remaining native alert/confirm calls in legacy data-management flows with the new modal/surface language.
- Add an authenticated fixture or component test harness for automated dashboard regression screenshots.
