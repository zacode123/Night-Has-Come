# Hyper-Realistic 3D Arena, Multiplayer Physical Doors, and WhatsApp Deliberation Suite

A production-grade architectural specification and step-by-step implementation plan for the complete overhaul of the Yooil Retreat arena, multiplayer synchronization, physical doors with one-sided locking, dual camera perspectives (First Person eye-level vs Third Person tactical), audio kinematics, admin dashboard updates, and WhatsApp-grade chat workflows.

---

## User Review & Critical Clarifications Confirmed

> [!IMPORTANT]
> The following decisions were clarified and confirmed directly with the user:
> 1. **Multi-Room Facility Architecture**: The arena will feature a multi-room facility layout with a central corridor, connecting doorways, and partitioned rooms (Dormitory, Lounge/Control Room, Cafeteria, and Storage/Infirmary) separated by ceiling-height walls.
> 2. **Physical Doors & Push Kinematics**: Doors are physical objects placed in doorways that do not auto-close. Players push into doors while moving to smoothly swing them open or closed.
> 3. **One-Sided Door Locks**: When standing near a door handle, a contextual floating prompt appears to lock or unlock the door. Crucially, if a door is locked from side A (e.g., inside Room 1), it can **only be unlocked from side A**. Anyone on side B cannot unlock it.
> 4. **Camera Modes**:
>    - **First Person `(eye icon) First Person`**: True eye-level perspective (~1.65m), looking straight forward horizontally with full wall occlusion (cannot see over walls or through gaps to other rooms), and the player's own mesh is hidden.
>    - **Third Person `(eye icon) Third Person`**: Enlarged camera view elevated behind the player, allowing visibility of their own avatar, other rooms, and broader tactical surroundings.
> 5. **Admin Identity & Seamless Transition**: When the admin starts the game from `/admin`, the admin session is propagated to `/game/[roomId]`, granting the admin master privileges, an Admin Master badge in the arena, and permission to purge date chat histories.
> 6. **Audio Kinematics**: Dedicated synchronized audio effects for walking, running, jumping, door pushing, and mechanical door locking/unlocking.

---

## 1. Overview & Core Features

### Requirements Breakdown
1. **Admin Page (`/app/admin/page.tsx`)**:
   - Room status tag: When a room has `status === 'in_game'`, render `"Running"` in bold red text (`text-red-500 bg-red-950/80 border border-red-600/40`) instead of `"In_game"`.
   - Room card delete action: Clicking the trash icon opens a confirmation modal before deleting the room and removing its players.
   - Admin game launch: Ensure admin credentials carry forward to the game route so the admin is recognized inside the room.

2. **Player Identity & Synchronization Fixes (`GameBoard.tsx`, `useGameState.ts`)**:
   - Fix real player vs bot bug: Remove erroneous default `is_bot ?? true` fallback. Ensure real players are never displayed with the `[BOT]` tag.
   - Fix multiplayer movement: Only simulate bot AI wandering for genuine bots (`p.is_bot === true`). Real players interpolate smoothly between received network broadcast positions (`x`, `z`, `rotation`, `gesture`).
   - Fast, resilient broadcast: Retain a single persistent Supabase Realtime channel for high-frequency position updates and door state synchronization.

3. **Multi-Room 3D Facility & Fixed Automatic Furnitures (`lib/roomGenerator.ts`, `GameBoard.tsx`)**:
   - High-fidelity room layout automatically seeded and fixed per room:
     - Central corridor (hallway) connecting East/West and North/South chambers.
     - 4 distinct rooms with hyper-realistic PBR materials (concrete floor tiles, weathered painted drywall, steel doorframes, floor skirtings).
     - Ceiling-height walls (height: 4.5m) so first-person view cannot peek over walls.
     - Rich furniture items (bunk beds, steel lockers, executive desks, conference tables, server racks, emergency lamps) with realistic geometry, bevels, and accent lighting.

4. **Physical Doors with One-Sided Lock Mechanics**:
   - Door entities with hinge positions, swing angles (0° closed, ±90° open), and lock state:
     - `isOpen: boolean`
     - `swingAngle: number`
     - `isLocked: boolean`
     - `lockedFromSide: 'front' | 'back' | null`
   - Push kinematics: When a player's bounding cylinder contacts an unlocked door mesh, the door swings open in the direction of the player's movement vector.
   - Contextual Lock Button: When near a door handle (< 1.8m):
     - Displays floating interaction button: `Lock Door` or `Unlock Door`.
     - One-sided rule check: If `door.isLocked && playerSide !== door.lockedFromSide`, lock button shows `"Locked from inside"` (disabled / blocked).
   - Door sync: Broadcast door state changes (`door_update`) over the room channel so all clients see doors swing and lock simultaneously.

5. **Dual Camera System**:
   - Control buttons:
     - Third Person: `[Eye Icon] Third Person`
     - First Person: `[Eye Icon] First Person`
   - First Person:
     - Camera positioned exactly at player head position `[x, 1.65, z]`.
     - Yaw tied to player facing direction; camera pitch looks horizontally straight ahead.
     - Current player avatar mesh is strictly hidden (`visible = false`).
     - Near clipping plane set to 0.1 to avoid clipping through nearby walls.
   - Third Person:
     - Camera pulled back and elevated (`distance: 7.5m`, `height: 5.5m`, FOV: 65°), giving an enlarged overview over walls and rooms.
     - Current player avatar mesh is fully visible with directional head and body.

6. **Audio Kinematics Engine (`lib/audioEngine.ts`)**:
   - Step sound generator with cadence:
     - Walk cadence (every 450ms, gentle footsteps).
     - Run cadence (every 260ms, heavier rapid footsteps).
   - Jump takeoff and landing audio.
   - Door creak / push swing audio and heavy latch click for lock/unlock.

7. **WhatsApp-Style Chat Enhancements (`components/ChatTab.tsx`)**:
   - Input placeholder: Remove `"(Markdown supported...)"`. Change placeholder to clean `"Type a message..."`.
   - Remove permanent top multi-select icon button from header: Selection mode is triggered strictly by long-pressing any message.
   - WhatsApp Selection Action Bar:
     - Close (X) button with selection count (`"2 selected"`).
     - Top Copy icon only (icon button, no text).
     - Select All / Deselect All icon button (toggles based on whether all messages are currently selected).
     - Edit icon button: Displayed only when exactly 1 own message is selected (opens inline edit input).
     - Delete icon button:
       - If selection contains any other person's message: Direct confirmation popup for `"Delete for me"`.
       - If selection contains ONLY own message(s): Prompt modal with choices: `"Delete for me"` (Trash icon) and `"Delete for everyone"` (Globe/Trash icon), followed by confirmation modal for the chosen action.
   - Date Dropdown Header:
     - Displays current active date label (`"Today"`, `"Yesterday"`, or formatted date like `"Oct 25"`) instead of generic `"Dates"`.
     - Long-pressing a date item in the dropdown activates date deletion modal to permanently wipe that date's messages from the database and clients.
     - Only visible / usable if the player is confirmed as Admin (`isHostOrAdmin === true`).

8. **Admin Game Integration (`app/game/[roomId]/page.tsx`, `app/admin/actions.ts`)**:
   - When Admin starts the game, propagate admin identity via secure cookie check / session query parameter (`?admin=1`).
   - Validate admin status in the game page, setting `isHostOrAdmin: true`.
   - Render special "ADMIN" badge on the player card and enable master chat moderation and date purge.

---

## 2. Technical Architecture & Data Flow

```
                      +-----------------------------+
                      |   Admin Page (/admin)       |
                      | - Room Status 'Running'     |
                      | - Room Delete Confirm Modal |
                      | - Start Game -> Game Arena  |
                      +--------------+--------------+
                                     |
                                     v
+--------------------------------------------------------------------------------+
|                        Game Arena (/game/[roomId])                             |
|                                                                                |
|  +--------------------+   +-----------------------+   +---------------------+  |
|  |   Camera System    |   | Procedural Facility   |   |   WhatsApp Chat     |  |
|  | - First Person:    |   | - Central Corridor    |   | - Long press select |  |
|  |   Eye level 1.65m, |   | - 4 Partitioned Rooms |   | - Icon-only bar     |  |
|  |   Horizontal view, |   | - Ceiling-height walls|   | - Edit icon button  |  |
|  |   Hidden self      |   | - Fixed furniture     |   | - Smart delete flow |  |
|  | - Third Person:    |   +-----------+-----------+   | - Active date label |  |
|  |   Enlarged FoV,    |               |               | - Admin date purge  |  |
|  |   Visible self     |               v               +----------+----------+  |
|  +--------------------+   +-----------------------+              |             |
|                           |   Physical Doors      |              |             |
|                           | - Push swing physics  |              |             |
|                           | - 1-sided lock handle |              |             |
|                           | - Synced state & VFX  |              |             |
|                           +-----------+-----------+              |             |
|                                       |                          |             |
+---------------------------------------+--------------------------+-------------+
                                        |
                                        v
                       +----------------------------------+
                       | Supabase Realtime Channel        |
                       | - player_position (fast rate)    |
                       | - door_update (push/lock sync)   |
                       | - chat_message & chat_delete     |
                       +----------------------------------+
```

---

## 3. Step-by-Step Implementation Stages

### Stage 1: Admin Page Upgrades
- **Target File**: `/app/admin/page.tsx`
- Update room card status rendering:
  - When `room.status === 'in_game'`, render `<span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-950/80 text-red-400 border border-red-500/50">Running</span>`.
  - When `room.status === 'waiting'`, render yellow/green tag as appropriate.
- Add Room Delete Confirmation Modal:
  - Wire trash button on room card to trigger `openConfirm('Delete Room', 'Are you sure you want to permanently delete room "${room.name}"? All assigned players will be unassigned.', () => handleDeleteRoom(room.id), 'danger')`.
- Start Game Redirection:
  - Ensure redirect includes admin indicator (e.g., `/game/${selectedRoomId}?admin=true`).

### Stage 2: Bug Fix for Real Players vs [BOT] Tag & Realtime Multiplayer Sync
- **Target Files**: `/components/GameBoard.tsx`, `/components/Avatar3D.tsx`, `/hooks/useGameState.ts`
- Fix bot tag in `Avatar3D.tsx` and `GameBoard.tsx`:
  - Change `isBot={player.is_bot ?? true}` -> `isBot={Boolean(player.is_bot)}`.
  - Fix bot simulation loop in `GameBoard.tsx`: Ensure bot AI routines ONLY track players where `p.is_bot === true`.
  - For human players (`!p.is_bot`), do NOT register in `botStates`. Use true received positions `player.x` and `player.z` with smooth interpolation (`lerp`).
- Fix Realtime Channel Broadcast:
  - In `useGameState.ts`, store and reuse a single stable Supabase channel reference instead of recreating channels on every broadcast tick.
  - Broadcast positions every 60-80ms for ultra-responsive multiplayer movement.

### Stage 3: Multi-Room Facility Layout & Automatic Fixed Furniture
- **Target Files**: `/lib/roomGenerator.ts`, `/components/GameBoard.tsx`
- Enhance `RoomLayout` in `roomGenerator.ts`:
  - Define connected multi-room facility:
    - Central Corridor: `[width: 6, depth: 36]`
    - Room 1 (Dormitory): West side, `[width: 14, depth: 16]`
    - Room 2 (Lounge / CCTV): East side, `[width: 14, depth: 16]`
    - Room 3 (Cafeteria): West side south, `[width: 14, depth: 16]`
    - Room 4 (Infirmary / Storage): East side south, `[width: 14, depth: 16]`
  - Interior and exterior walls built up to 4.5m height so players cannot peek into adjacent rooms in First Person view.
  - Doorways (openings) cut into wall segments between rooms and the central corridor.
  - Fixed, realistic furniture layout automatically placed per room (bunk beds, steel lockers, executive desk, monitor consoles, metal dining tables, medical cabinets).

### Stage 4: Physical Doors with Push Swing & One-Sided Locking
- **Target Files**: `/lib/roomGenerator.ts`, `/components/GameBoard.tsx`, `/hooks/useGameState.ts`
- Define Door data model:
  - `id: string`, `roomA: string`, `roomB: string`
  - `position: [x, y, z]`, `width: number`, `height: number`, `orientation: 'NS' | 'EW'`
  - `hingeSide: 'left' | 'right'`
  - `currentAngle: number` (0 to Math.PI / 2)
  - `isLocked: boolean`
  - `lockedSide: 'roomA' | 'roomB' | null`
- Implement Door Push Physics in `GameBoard.tsx`:
  - When player collides with an unlocked door, calculate the dot product between the player's movement direction and door normal to smoothly push open the door in that direction.
  - Door stays open where pushed; walking back through it can push it closed.
- Contextual Door Handle UI:
  - When current player is within 1.6m of a door handle:
    - Determine which side of the door the player is on (`playerSide`).
    - If door is unlocked: Render floating button at door handle: `[Lock Door]`.
    - If door is locked:
      - If `playerSide === door.lockedSide`: Render `[Unlock Door]`.
      - If `playerSide !== door.lockedSide`: Render `[Locked from other side]` (disabled red indicator).
  - Broadcast door state updates (`door_update`) across the room channel.

### Stage 5: Dual Camera System (First Person vs Enlarged Third Person)
- **Target Files**: `/components/GameBoard.tsx`
- Replace mode toggles:
  - Third Person button: `<Eye size={14} /> Third Person`
  - First Person button: `<Eye size={14} /> First Person`
- First Person Camera:
  - Position: `[playerPos.x, 1.65, playerPos.z]`.
  - Look vector: Horizontal forward direction based on `playerRot` (`lookAt(x + sin(rot)*10, 1.65, z + cos(rot)*10)`).
  - Hide current player avatar (`isCurrentPlayer && cameraMode === 'firstPerson' => hide mesh`).
  - Strict wall collision and near clip plane (`near: 0.08`) so players cannot see through walls or over partitions.
- Third Person Camera:
  - Enlarged tactical perspective: `distance: 7.2m`, `height: 5.2m`, `FOV: 65°`.
  - Smooth camera lerping following player.
  - Current player avatar is fully visible with head, torso, limbs, and nameplate.

### Stage 6: Synchronized Audio Kinematics
- **Target File**: `/lib/audioEngine.ts`
- Add procedural audio synthesizers (using Web Audio API so no missing external audio assets):
  - `playFootstep(type: 'walk' | 'run')`: Crisp synthesized footsteps matching cadence (faster pitch/tempo for run).
  - `playJump()` and `playLand()`: Subtle air woosh and firm ground contact.
  - `playDoorPush()`: Smooth wooden/metal hinge swing resonance.
  - `playDoorLock()` and `playDoorUnlock()`: Satisfying mechanical bolt clicks.

### Stage 7: WhatsApp-Style Chat Overhaul
- **Target File**: `/components/ChatTab.tsx`
- Clean Input Bar:
  - Remove `(Markdown supported...)` from input placeholder. Clean placeholder: `"Type a message..."`.
- Remove Header Multi-Select Toggle Button:
  - Selection mode is activated strictly via long-press on any message bubble.
- Selection Action Bar:
  - Close button with selection count.
  - Top `Copy` icon button only (no text label).
  - `Select All` / `Deselect All` icon button (toggles between `CheckSquare` and `Square`).
  - `Edit` icon button: Displayed only if exactly 1 message is selected AND it is authored by the current user. Tapping it opens inline edit mode for that message.
- Smart Deletion Flow:
  - If selection includes messages from other players:
    - Clicking Trash icon opens direct confirmation modal: `"Delete for me? This will remove the selected messages for you only."`
  - If selection contains ONLY own message(s):
    - Clicking Trash icon displays choice modal with 2 options with icons:
      1. `Delete for me` (Trash icon)
      2. `Delete for everyone` (Globe/Trash icon)
    - Selecting an option triggers confirmation modal for that choice before executing.
- Date Dropdown & Admin Date Purge:
  - Change dropdown trigger label from `"Dates"` to the active/current date label (e.g., `"Today"`, `"Yesterday"`, or formatted date).
  - Long-pressing a date in the dropdown opens permanent date history wipe modal.
  - Restrict date deletion: Only show/enable this if `isHostOrAdmin === true`.

### Stage 8: Admin Propagation & Verification
- **Target Files**: `/app/game/[roomId]/page.tsx`, `/app/admin/actions.ts`
- Game page verifies if the current visitor is the admin (checking admin session cookie / query parameter).
- Grants full admin status in the room (`isHostOrAdmin: true`), displaying `[ADMIN MASTER]` badge in the 3D nametag and enabling date chat purge.

---

## 4. Verification Plan

1. **Admin Page Verification**:
   - Inspect `/admin`: Verify room with `in_game` status renders `"Running"` in red.
   - Click room card delete icon: Confirm delete confirmation modal appears and successfully deletes the room on confirmation.
2. **Player Tag & Multiplayer Sync**:
   - Join room with real player: Confirm player is NOT tagged `[BOT]`.
   - Verify movement broadcasts in real time and is reflected accurately across multiple client windows.
3. **Multi-Room Facility & Doors**:
   - Verify 4 connected rooms and central corridor with 4.5m walls.
   - Walk into a door: Verify smooth physical push swing.
   - Approach door handle: Verify floating lock/unlock button appears.
   - Test one-sided lock rule: Lock door from inside Room 1; verify player outside Room 1 cannot unlock it.
4. **Camera Modes**:
   - Toggle to `First Person`: Verify true eye-level view, horizontal sightline, hidden self-avatar, and complete wall occlusion.
   - Toggle to `Third Person`: Verify enlarged perspective, visible self-avatar, and wide facility overview.
5. **Chat Interface**:
   - Verify input placeholder is `"Type a message..."` without markdown mention.
   - Verify top header selection button is removed; long-press activates selection mode.
   - Verify Copy icon, Select/Deselect All icon, and Edit icon button.
   - Test deletion: Others' message triggers "Delete for me" confirm; own messages trigger choice modal with icons before confirmation.
   - Verify date dropdown title shows active date (e.g. "Today"), and long-pressing a date allows Admin to purge that date's messages.
