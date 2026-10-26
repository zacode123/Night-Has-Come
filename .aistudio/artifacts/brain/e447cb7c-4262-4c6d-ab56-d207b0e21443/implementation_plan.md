# 3D Multiplayer Arena & Realistic Controls Implementation Plan

A comprehensive overhaul of the 3D multiplayer arena: introducing dynamic collision-free open-space player spawning, a 30-second pre-game arena warmup timer with TTS voiceover and animated rules explanation, rich "Moody Mystery Manor" 3D graphics with wall-mounted lighting sconces and vintage props, corrected forward/backward joystick and keyboard steering, stylized articulated humanoid character models with modeled hands and feet, and zero-error build verification.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The clarifying questions have been confirmed by the user:
> - **Pre-game Rules & 30-second Timer**: Audio voiceover narration with animated visual rules banner.
> - **Player Model Visual Style**: Stylized humanoid characters with articulated arms, legs, detailed hands, and shoes.
> - **Environment & Lighting Aesthetic**: Moody mystery manor with warm wall sconces, antique lamps, and furniture.

---

### 1. Overview & Core Concept

- **What It Does**:
  1. **Dynamic Open-Space Spawning**: Players and bots only spawn into the 3D world when actively connected. Spawns are dynamically calculated in open room and corridor space, mathematically guaranteed not to glitch into walls, doorways, or furniture.
  2. **30-Second Pre-Game Arena Warmup**: When the admin starts the game, players are instantly redirected to the 3D arena. A prominent 30-second countdown timer runs while players have full freedom to move, sprint, jump, inspect rooms, and chat. When the 30 seconds elapse, an atmospheric voiceover announces the game start and explains the five core game rules via speech synthesis accompanied by an animated rules briefing banner.
  3. **Moody Mystery Manor 3D Environment**: High-fidelity lighting and interior decoration with warm wall sconces, glowing filament bulbs on upper wall perimeters, wooden wall trims, plush rugs, bookshelves, grandfather clock, and calibrated PBR materials with soft point lights and contact shadows.
  4. **Corrected Game Controls**: Fixes the inverted coordinate mapping so forward joystick/W moves forward into the scene away from the camera, backward/S pulls back, and left/right strafe/steer intuitively.
  5. **Articulated Humanoid Models**: Upgrades the player and bot 3D avatars with modeled hands (palms, fingers, thumbs) and feet (shoes, soles, toe boxes) with natural shoulder and hip pivot kinematics, walking/running gait cycles, and breathing idle animation.
  6. **Clean Build & Linting**: Resolves all ESLint `react-hooks/set-state-in-effect` and dependency warnings so `npm run build` and `next build` execute cleanly with 0 errors.

---

### 2. User Experience & Visual Design

#### A. Key User Flows
1. **Lobby to Warmup Arena**:
   - Admin triggers "Start Game".
   - All approved players in the room are immediately redirected to `/game/[roomId]`.
   - Players spawn at validated random open-floor coordinates inside the manor complex.
2. **Warmup Period (30 Seconds)**:
   - A prominent, elegant floating timer at the top center displays `WARMUP: 00:30`, counting down smoothly.
   - Players can explore all 4 manor chambers (Study, Parlor, Dining Hall, Infirmary) and the Grand Gallery corridor.
   - Full touch/keyboard movement, jumping, sprinting, live chat, and audio calls are functional.
3. **Game Briefing & Rules Announcement**:
   - As the countdown hits `00:00`, the arena plays an atmospheric chime sound effect.
   - Audio narration speaks: *"Curfew has fallen upon Yooil Manor. The game has begun."* followed by a simple, clear explanation of roles (Mafia, Citizens, Doctor, Police) and daily cycles (Night curfew -> Morning revelation -> Discussion -> Voting).
   - An elegant animated banner slides down presenting the rules in plain English with an option to minimize or dismiss.
4. **Intuitive Controls**:
   - Dragging the virtual joystick up or pressing W moves the player forward into the room.
   - Dragging down or pressing S moves the player backward.
   - Left and right smoothly steer and strafe.

#### B. Visual Identity & Atmosphere
- **Palette**: Deep noir obsidian (`#090d16`), warm antique walnut (`#291a10`), brass gold sconce accents (`#d97706`), warm amber bulb glow (`hsl(38, 90%, 65%)`), and crimson alert highlights (`#ef4444`).
- **Wall Fixtures & Lighting**:
  - 3D wall sconce brackets mounted along corridor and room walls with protruding brass stems and glowing glass bulbs.
  - Realistic point lights with realistic decay (`distance={12}`, `decay={2}`) casting warm ambient pools on the floor and walls.
- **Character Models**:
  - Stylized humanoid proportions with distinct torso clothing, personality color trims, articulated shoulders, forearms, hands, hips, knees, and shoes.
  - Smooth swinging gait synchronized with character speed (walk vs. sprint).

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Open-Space Collision-Free Spawn Calculation**
  - *Chosen Approach*: Implement a procedural spatial validator `getSafeOpenSpawnPoint()` that tests candidate coordinates against all wall rectangles (with 1.2m buffer) and furniture bounding boxes (with 0.8m buffer) before assigning spawn points.
  - *Why*: Eliminates the glitch where players spawn inside a wall or under a bed/table.
- **Decision 2: 30-Second Pre-Game Arena State Management**
  - *Chosen Approach*: Track `warmup_started_at` in the game session. If current time is within 30 seconds of game start, the arena enters `Warmup` sub-state with full player agency, transitioning automatically to `Night` rules briefing when elapsed.
  - *Why*: Gives players immediate visual immersion, reduces waiting frustration, and guarantees all players have loaded the 3D assets before high-stakes gameplay begins.
- **Decision 3: Voiceover Engine + Accessible Visual Banner**
  - *Chosen Approach*: Combine browser Web Speech API / TTS endpoint with an animated dismissible rules card.
  - *Why*: Delivers dramatic cinematic immersion while remaining accessible for players who have audio muted or prefer reading.
- **Decision 4: Control Vector Coordinate Alignment**
  - *Chosen Approach*: Correct the joystick and keyboard vector mapping relative to the third-person follow camera so screen-up translates to forward translation (`+Z` or `-Z` matching camera forward look-vector).
  - *Why*: Resolves the inverted control bug reported by the user.

---

### 4. Technical Architecture & System Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                        NEXT.JS MULTIPLAYER APP                         │
├───────────────────────────────────┬────────────────────────────────────┤
│           Admin Controls          │           Player Client            │
│  ┌─────────────────────────────┐  │  ┌──────────────────────────────┐  │
│  │ "Start Game" Action         │  │  │ Realtime Sync (/game/[id])   │  │
│  │ Sets status = 'in_game'     │─►│  │ Warmup Countdown (30s)       │  │
│  │ Sets warmup_end_time = +30s │  │  │ Free 3D Movement & Chat      │  │
│  └─────────────────────────────┘  │  └──────────────┬───────────────┘  │
│                                                     │                  │
│                                   ▼                 ▼                  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                       3D VIEWPORT ENGINE                         │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │ Safe Open-Space Spawning (Collision Buffer Testing)       │  │  │
│  │  ├────────────────────────────────────────────────────────────┤  │  │
│  │  │ Moody Mystery Manor Environment                           │  │  │
│  │  │ - Brass Wall Sconces & Emissive Filament Bulbs             │  │  │
│  │  │ - PointLights with warm amber temperature                 │  │  │
│  │  │ - Vintage rugs, wooden furniture, and bookshelves         │  │  │
│  │  ├────────────────────────────────────────────────────────────┤  │  │
│  │  │ Fixed Dual-Axis Joystick & Keyboard Kinematics             │  │  │
│  │  │ - Forward/Backward & Strafe/Steer coordinate alignment    │  │  │
│  │  ├────────────────────────────────────────────────────────────┤  │  │
│  │  │ Articulated Multi-Part Humanoid Avatar                    │  │  │
│  │  │ - Torso, Head, Shoulders, Arms, Hands, Legs, Shoes       │  │  │
│  │  │ - Natural walk/run limb swing & footstep bobbing          │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
│                                     │                                  │
│                                     ▼                                  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │           RULES BRIEFING & AUDIO NARRATION ENGINE                │  │
│  │  - Web Speech TTS Audio Synthesis / API TTS                      │  │
│  │  - Animated Glassmorphic Rules Banner Overlay                    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 5. Implementation Stages & Verification Strategy

1. **Stage 1: Spatial Generator & Safe Spawn Points (`lib/roomGenerator.ts`)**
   - Define collision boxes for all walls, partitions, and furniture.
   - Build `getSafeOpenSpawnPoint()` to generate guaranteed open-space coordinates.
   - Enrich room furniture: wooden study desks, antique armchairs, Persian rugs, vintage bookcases, grandfather clock.
   - Add wall-mounted lighting sconce positions along walls and above doorway arches.

2. **Stage 2: 3D Environment, Wall Bulbs & Lighting (`components/GameBoard.tsx`)**
   - Create `WallSconceBulb` component: brass fixture plate, curved mounting arm, emissive glass bulb, and warm amber `pointLight` with realistic falloff.
   - Update ceiling and wall shaders to moody manor tones with vintage wood panelling.
   - Add contact shadow planes under props.

3. **Stage 3: Controls Inversion Fix (`components/GameBoard.tsx` & `components/VirtualJoystick.tsx`)**
   - Fix joystick output vector and keyboard `w/s/a/d` coordinate transformation so forward moves in the direction of the camera view, backward pulls back, and left/right steers.
   - Add mouse drag support to VirtualJoystick so desktop testing works seamlessly with cursor as well as touch.

4. **Stage 4: Articulated Humanoid Model (`components/Avatar3D.tsx`)**
   - Construct composite 3D character with shoulder joints, upper arms, forearms, hands (palms and fingers), hip joints, thighs, calves, and shoes with soles.
   - Implement realistic walking/running gait kinematics with joint rotation and torso stabilization.

5. **Stage 5: 30-Second Warmup Arena, TTS Voiceover & Animated Rules Banner**
   - Enhance `app/game/[roomId]/page.tsx` and `components/Timer.tsx` with a 30-second Warmup phase HUD.
   - At countdown completion, trigger voiceover audio rules explanation via `lib/narrationEngine.ts` / Web Speech API and display an animated rules banner card.

6. **Stage 6: Lint, Deprecations & Build Verification**
   - Resolve ESLint warnings and errors across hooks and components.
   - Run `compile_applet` and `lint_applet` to verify zero errors.
