# Game Architecture & Redirection Stabilization Plan

A comprehensive engineering plan to eliminate reload redirection loops, enforce strict room access gatekeeping, upgrade 3D player movement physics, refine avatar face rendering, and introduce a full Bot Hiring Workshop in the Admin dashboard.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were confirmed with the user during Phase 1:
> - **Session Persistence & Redirection**: Loading screens will remain active during page reloads until player credentials and room records are fully verified against Supabase, preventing premature redirection cascades.
> - **Game Access Gatekeeping**: Players attempting to navigate directly to `/game/[roomId]` before the admin starts the game will be blocked and redirected back to `/approved`. The manual "Enter Game" button on the approved page is completely removed.
> - **Bot Workshop in Admin**: A full Bot Hiring & Customization suite will be added to the Admin panel to configure bot name, age, personality, system instructions, and target room.

---

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                          REALTIME STATE BUS                            │
│                 (RealtimeProvider / Supabase Client)                   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
           ┌────────────────────────┴────────────────────────┐
           ▼                                                 ▼
┌───────────────────────┐                         ┌───────────────────────┐
│   Authentication &    │                         │   Room State Guard    │
│  Session Restoration  │                         │ (Status === 'in_game')│
└──────────┬────────────┘                         └──────────┬────────────┘
           │                                                 │
           ▼                                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                              ROUTING HUB                               │
│  • Loading: Pure dark overlay until verified                           │
│  • /approved: Waits for 'in_game' event -> auto-redirects to /game     │
│  • /game/[id]: Guard blocks unstarted games -> routes back to /approved│
│  • / (root): If registered & room in_game -> auto-redirects to /game   │
└────────────────────────────────────────────────────────────────────────┘
                                    │
           ┌────────────────────────┴────────────────────────┐
           ▼                                                 ▼
┌──────────────────────────────────────┐  ┌───────────────────────────────┐
│           GAME CLIENT 3D             │  │        ADMIN WORKSHOP         │
│ • Smooth momentum & friction physics │  │ • Room & player oversight     │
│ • Realistic banking & smooth turns   │  │ • Full Bot Crafting Studio:   │
│ • Avatar faceplate: photo or blank   │  │   Name, Age, Personality,     │
│ • Stylized Bot Insignia (no emojis)  │  │   System Instructions, Room  │
└──────────────────────────────────────┘  └───────────────────────────────┘
```

---

## 1. Overview & Core Concept

This update resolves the reload race conditions in the authentication and real-time state listeners of the thriller deduction game ("Night Has Come"). It secures game room access so that only games officially started by the admin can be joined, makes player movement feel responsive and physically grounded with inertia and smooth angular acceleration, ensures avatar aesthetics match the design vision (real user profile photo or clean plate, tech bot emblem instead of emojis), and equips the game admin with a dedicated bot creation suite.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Page Reload on `/approved`**:
   - The user refreshes the browser while on the `/approved` page.
   - The global `RealtimeProvider` displays a subtle atmospheric loading indicator while synchronously checking local credentials and verifying the player record in Supabase.
   - Once verified with `status === 'approved'`, the user stays seamlessly on `/approved` without flashing `/rejected` or `/`.
   - Local storage and cookies are never cleared prematurely.

2. **Game Launch & Automatic Redirection**:
   - The user waits on `/approved` with ambient thriller audio and an animated "Waiting for admin to start the game..." status. The manual "Enter Game Room" button is removed.
   - As soon as the admin clicks "Start Game" in the admin dashboard, the `rooms` status shifts to `in_game`.
   - The approved user's client instantly detects the change via Supabase Realtime and automatically navigates to `/game/[roomId]`.
   - If a registered user opens `/` (root) while their game is active, they are automatically forwarded directly to `/game/[roomId]`.
   - If an unauthorized user or any user before game launch types `/game/[roomId]` directly into the address bar, the route guard intercepts them, prevents the 3D scene from loading, and redirects them to `/approved` or `/`.

3. **3D Avatar & Physics Gameplay**:
   - Walking, running, and turning feel natural with linear acceleration, friction damping, collision sliding along room furniture, and banking lean during sharp turns.
   - Players with an uploaded photo see their photo rendered cleanly on their 3D head faceplate. Players without an avatar have a clean, minimalist faceplate without ugly placeholder silhouettes.
   - Bots display a custom high-tech cyber emblem on their faceplate and a clean text badge above their head (no emojis).

4. **Admin Bot Workshop**:
   - Inside `/admin`, a dedicated "AI Bot Workshop" section allows the admin to craft autonomous AI bot participants.
   - Form fields include: Room Selection, Bot Name (with randomizer), Age (10-20), Personality Archetype, and System Instructions / Behavior Directives.
   - Admin can spawn bots with one click; bots are marked `is_bot: true`, assigned to the room, and approved to participate.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Synchronous State Seeding in `RealtimeProvider`**
  - *Chosen Approach*: Initialize `isLoading: true` and only set `isLoading: false` after the database lookup returns or fails definitively. If a `playerId` exists in cookies or localStorage, hold loading until the player record is confirmed or 404s.
  - *Why*: Eliminates the zero-millisecond render frame where `player` is `null` while `isLoading` was set to `false`, which was the direct cause of the redirect chain (`/approved` -> `/rejected` -> `/` -> session wiped).
  - *Alternatives Considered*: Checking `localStorage` inside each page component individually was rejected because it fragments state and causes desynchronization.

- **Decision 2: Server & Route-Level Guard for `/game/[roomId]`**
  - *Chosen Approach*: Verify room status (`room.status === 'in_game'`) and player approval before mounting the heavy Three.js canvas. If either check fails, redirect immediately with an informative notification or silent push back to `/approved`.
  - *Why*: Completely blocks URL spoofing, manual URL hacking, and premature room access while preserving battery and memory.

- **Decision 3: Inertia & Smooth Physics in `GameBoard.tsx`**
  - *Chosen Approach*: Replace instant discrete position increments with velocity integration, acceleration vectors, friction deceleration, and smooth rotation slerp.
  - *Why*: Removes robotic twitching and gives characters weight, momentum, and believable kinematics.

- **Decision 4: Custom Canvas Bot Vector Insignia vs Emoji**
  - *Chosen Approach*: Render an SVG/Canvas cyber-circuit crest on the bot's faceplate and replace `🤖` in the 3D text nameplate with a clean `[BOT]` indicator.
  - *Why*: Fulfills the user's explicit requirement while elevating the dark thriller aesthetic.

---

## 4. Technical Architecture & Component Strategy

### Component & State Transition Diagram

```
┌────────────────────────────────────────────────────────┐
│                   RealtimeProvider                     │
│  - Reads 'playerId' cookie/localStorage synchronously  │
│  - Fetches player from Supabase                        │
│  - Holds isLoading = true until response               │
└───────────────┬────────────────────────┬───────────────┘
                │                        │
       [Player Verified]        [No Player Found]
                │                        │
                ▼                        ▼
       ┌─────────────────┐      ┌─────────────────┐
       │ Status:approved │      │ Status: guest   │
       └────────┬────────┘      └────────┬────────┘
                │                        │
        ┌───────┴───────┐                ▼
        │               │         Redirect to /
  Room 'waiting'  Room 'in_game'
        │               │
        ▼               ▼
   /approved        /game/[id]
 (Auto-listen)     (Scene Loads)
```

### Module Responsibilities

1. **`components/RealtimeProvider.tsx`**:
   - Preserve `isLoading: true` until `currentPlayerId` has been checked against the database.
   - Never set `isLoading: false` when a stored ID is still awaiting query resolution.

2. **`app/approved/page.tsx`**:
   - Remove the manual "▶ Enter 3D Game Room" button.
   - Listen to `room?.status === 'in_game'` to automatically route to `/game/${room.id}`.
   - Avoid redirecting to `/rejected` unless `player.status === 'rejected'` explicitly.

3. **`app/page.tsx`**:
   - Only remove cookies / localStorage if a user explicitly logs out or if Supabase explicitly confirms the user was deleted, never merely because `player` is initializing.
   - Auto-redirect registered players in active games to `/game/${room.id}`.

4. **`app/game/[roomId]/page.tsx`**:
   - Inspect `room.status`. If `room.status !== 'in_game'`, immediately redirect to `/approved`.
   - Prevent rendering `GameBoard` if game has not started.

5. **`components/GameBoard.tsx` & `components/Avatar3D.tsx`**:
   - Physics: Introduce velocity `vx, vz`, acceleration, friction coefficient (`0.88`), rotation interpolation, and collision restitution against furniture bounding boxes.
   - Avatar Faceplate: If `avatar_base64` exists, draw circular profile photo. If empty, draw clean unadorned faceplate with personality rim. If bot, render cyber tech insignia.
   - Nameplate: Remove `🤖` emoji; render clean text with subtle `[BOT]` prefix.

6. **`app/admin/page.tsx` & `app/admin/actions.ts`**:
   - Add a full "AI Bot Workshop" form with:
     - Target room selector.
     - Bot Name input with random name generator button.
     - Age slider (10 to 20).
     - Personality Archetype selector (8 personalities).
     - System Instructions textarea (custom behavioral prompts).
     - "Deploy Bot" button that inserts into `players` with `is_bot: true, status: 'approved', room_id: selectedRoomId`.
     - Active bots management list to view and dismiss bots.
