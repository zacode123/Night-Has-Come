# Night Has Come: GTA-Style 3D Thriller Survival Game

A complete, production-grade 3D multiplayer survival and social deduction game inspired by the Korean thriller *Night Has Come*. The application features a mobile-first split-screen interface: the top half is an interactive GTA-style 3D world with custom player avatars, live walking/running/jumping physics, realistic NPC AI bots, and procedural retreat center rooms; the bottom half is an instant real-time discussion center with WhatsApp-style voice notes, message editing/deletion, and full-screen expansion toggles. A cinematic top announcement banner provides live game alerts and narration powered by an extensible TTS architecture.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following core design decisions are locked in and confirmed:
>
> - **Avatar Representation in 3D**:
>   - Player's head displays their uploaded profile picture as a sharp texture.
>   - Fallback: Sleek stylized silhouette with personality-themed color ring.
>   - AI Bots: Dedicated cybernetic/bot icon with personality archetype label.
> - **GTA-Style Gaming Controls**:
>   - Controls: Move Forward, Backward, Turn Left/Right, Sprint/Run boost, Jump, and Role Action (Attack/Heal/Investigate).
>   - Mobile Layout: Floating virtual analog joystick on the bottom-left; Sprint, Jump, and Action buttons on the bottom-right.
>   - Desktop Layout: WASD / Arrow keys, `Shift` to Sprint, `Space` to Jump, `E` to interact.
>   - Camera View: Real-time toggle button between Third-Person Over-the-Shoulder Follow Camera and Tactical Isometric Angle.
> - **NPC Realism for AI Bots**:
>   - Bots behave like real-life NPCs: procedural room wandering, inspecting 3D furniture, idle fidgeting, fleeing suspects, and following allies.
> - **Top Announcement System & Pluggable TTS**:
>   - Cinematic top notification banner displaying phase changes, dramatic alerts, and broadcast narration.
>   - Modular TTS client interface in `lib/narrationEngine.ts` structured to accept your designated external TTS endpoint, with Web Speech API and Gemini audio as built-in fallbacks.
> - **Real-Time Discussion & Voice Messaging**:
>   - WhatsApp-style one-tap voice note recorder with waveform visualization and playback.
>   - Instant text messaging with message Edit, Delete, and real-time read indicators.
> - **Viewport Ergonomics**:
>   - Default 50/50 split on mobile with quick buttons to maximize Top 3D Game (100%) or Bottom Chat (100%).

---

## 1. Overview & Core Concept

- **What It Does**: Immerses players into Yooil High School's deadly simulation retreat center. Players physically navigate 3D environments, perform night actions in real time, and deliberate over suspect identities in a synchronized split-screen chat and voice room. Empty player slots can be filled on demand with autonomous AI bots possessing realistic human NPC behaviors and distinct personality traits.
- **Target Audience / Persona**: Mobile and desktop gamers, fans of social deduction thrillers (*Night Has Come*, *Among Us*, *Town of Salem*), and role-play communities.
- **Key Value**: Combines the spatial freedom of a 3D open-world game (running, jumping, hiding, chasing) with the psychological depth of real-time voice notes and social deduction.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Sign Up & Character Customization**:
   - Iconic horror blood-red landing page with 3D floating retreat artifacts, ambient mist, and dripping Nosifer typography.
   - Profile creation: username, age (10–20), personality archetype (Leader, Quiet Observer, Strategic Thinker, Rebellious, etc.), and profile photo upload with automated EXIF rotation fix and circular preview.
2. **Room Lobby & Bot Hiring**:
   - Host can create or select rooms, view waiting players, and open the "Hire AI Bots" selector.
   - Host chooses 1–9 AI bots with customized personalities to immediately fill the lobby and start matches without waiting for human players.
3. **Split-Screen In-Game Experience**:
   - **Top 50% (GTA-Style 3D Arena)**:
     - 3D environment generated with procedural furniture (dormitory bunks, lounge couches, cafeteria tables, storage lockers, blood trail markers).
     - Live player avatars walking, sprinting, jumping, and gesturing with headshots displayed directly on character models.
     - Bottom-left floating joystick + bottom-right Jump and Sprint buttons.
     - Camera switch toggle (Third-Person Follow ⇋ Isometric View).
   - **Divider Bar (Quick Sizing)**:
     - ⛶ Fullscreen 3D Arena (hides chat for stealth and navigation).
     - 💬 Fullscreen Chat & Voice (expands chat for heated trials and voting).
     - ⚖️ 50/50 Reset Button.
   - **Bottom 50% (Live Chat & Voice Hub)**:
     - WhatsApp-style chat feed: sender avatar, personality border, time, and role status.
     - Long-press / context menu to Edit or Delete sent messages.
     - One-touch microphone button to record instant voice notes with live audio waveform animation.
     - Audio player component with scrub bar and duration indicator.
4. **Cinematic Top Announcement & Narration**:
   - Floating top banner with pulsing red warning strobe, displaying ominous announcements ("Night has fallen. Curfew in effect.", "A body was discovered in the lounge.", "Voting begins now.").
   - Audio narration voice triggered automatically with pluggable TTS endpoint hook.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Toggleable Third-Person Follow & Isometric Camera
- **Chosen Approach**: Allow players to switch between a GTA-style third-person camera that follows the avatar's back and an isometric bird's-eye view.
- **Why**: Third-person view delivers intense suspense when turning dark corners, while isometric view gives tactical clarity for seeing where all other players and bots are gathered.

### Decision 2: Profile Picture Textures on 3D Avatars
- **Chosen Approach**: Three.js CanvasTexture / Billboard mesh attached to the avatar's head displaying the player's uploaded profile picture, with a fallback silhouette for players without pictures and an animated cyber badge for AI bots.
- **Why**: Instantly identifies players in 3D without needing to squint at tiny name tags, reinforcing social immersion.

### Decision 3: Realistic NPC AI Bot Behaviors
- **Chosen Approach**: Server and client-authoritative bot controller that gives bots autonomous movement goals (wandering between furniture waypoints, pausing to inspect props, fleeing when attacked, gathering during daytime discussions) rather than standing frozen.
- **Why**: Bots feel alive and believable, preventing matches from feeling like ghost lobbies.

### Decision 4: Pluggable External TTS Architecture
- **Chosen Approach**: A centralized `narrationEngine.ts` with a clean configuration slot `customTtsEndpoint`: when provided by the user, narration requests route directly to that endpoint; otherwise, it seamlessly utilizes Gemini TTS and browser Web Speech.
- **Why**: Gives full flexibility for the user to inject their private TTS endpoint at the final stage while providing immediate voice narration out of the box.

---

## 4. Technical Architecture & Component Hierarchy

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SPLIT-SCREEN CLIENT VIEW                        │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │      Top Announcement HUD (Phase Banners & Pluggable TTS)        │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │              TOP HALF: 3D GTA-STYLE GAME VIEWPORT                │  │
│  │  • Three.js Canvas & Scene Manager                               │  │
│  │  • Procedural Room Layout (Furniture, Props, Collision Boxes)    │  │
│  │  • 3D Avatars (Player PFP Heads / Bot Cyber Icons)               │  │
│  │  • GTA Controls (Walk, Sprint, Jump, Role Actions)               │  │
│  │  • Floating Virtual Joystick (Left) + Sprint/Jump Buttons (Right)│  │
│  │  • Camera Mode Toggle (Third-Person Follow ⇋ Isometric)          │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │   Viewport Mode Controls: [ ⛶ Full Game ]  [ ⚖ 50/50 ]  [ 💬 Chat ]│  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │              BOTTOM HALF: WHATSAPP-STYLE LIVE CHAT               │  │
│  │  • Real-time Message Stream with Edit / Delete Actions           │  │
│  │  • WhatsApp Audio Recorder (MediaRecorder API)                   │  │
│  │  • Interactive Waveform Audio Player                             │  │
│  │  • Role Action Bar (Doctor Heal, Mafia Kill, Police Scan)        │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ WebSocket / Realtime Channel
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                             SERVER BACKEND                             │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                  Authoritative Game Engine & Sync                 │ │
│  │  • Room Lifecycle (Night ➔ Morning ➔ Discussion ➔ Voting)         │ │
│  │  • Avatar Position & Gesture Sync (Broadcasts 10-20 Hz)          │ │
│  │  • Message Persistence, Edit, Delete, Voice Note Relay           │ │
│  └──────────────────────────────────┬────────────────────────────────┘ │
│                                     │                                  │
│             ┌───────────────────────┴───────────────────────┐          │
│             ▼                                               ▼          │
│  ┌─────────────────────────────┐             ┌───────────────────────┐ │
│  │     NPC AI Bot Runtime      │             │  Pluggable TTS Engine │ │
│  │  • NPC Room Wander & Idles  │             │  • User Custom Hook   │ │
│  │  • Deception & Voting Logic │             │  • Gemini Audio       │ │
│  │  • Contextual AI Voice Notes│             │  • Web Speech Engine  │ │
│  └─────────────────────────────┘             └───────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

### Component & File Mapping

1. **`components/GameBoard.tsx`**:
   - Replaced with full 3D interactive viewport: Three.js canvas, floor geometry, dynamic room furniture, isometric/chase camera controller, floating virtual joystick, and action triggers.
2. **`components/Avatar3D.tsx`**:
   - 3D avatar mesh with customized head (player uploaded image as CanvasTexture, bot icon mesh, or default silhouette), walk/sprint bobbing, jump vertical displacement, and role action animations.
3. **`components/VirtualJoystick.tsx`**:
   - Smooth multi-touch thumb joystick with vector angle/magnitude calculations, sprint boost button, and jump button.
4. **`components/AnnouncementBanner.tsx`**:
   - Top notification overlay with flashing warning lights, marquee/drip typography, and audio voice trigger.
5. **`components/ChatTab.tsx`**:
   - Enhanced with WhatsApp audio recorder (using browser `navigator.mediaDevices.getUserMedia`), interactive audio waveform bubbles, message edit modal, and delete options.
6. **`components/BotHireModal.tsx`**:
   - Host modal allowing instant hiring of 1 to 9 AI bots with chosen personality presets (Leader, Quiet Observer, Aggressive, Rebellious).
7. **`lib/narrationEngine.ts`**:
   - Centralized audio broadcast coordinator with pluggable `setCustomTtsEndpoint(url)` method ready for your endpoint, supported by automatic speech fallback.
8. **`lib/roomGenerator.ts`**:
   - Procedural furniture and room prop generator for distinct retreat locations (Dormitory, Lounge, Cafeteria, Basement).

---

## 5. Execution Stages

1. **Stage 1: 3D GTA-Style Avatar & Controller Engine**
   - Implement `VirtualJoystick.tsx` and keyboard bindings (WASD + Shift + Space).
   - Build 3D player avatars with profile picture head textures, bot cyber icons, and jump/sprint physics.
   - Implement toggleable Third-Person Follow and Isometric camera modes.
2. **Stage 2: NPC AI Bot Wandering & Room Layout Generator**
   - Build procedural room generator placing 3D furniture (beds, couches, lockers, tables, ambient lights).
   - Create NPC Bot behavior loop: autonomous room wandering, furniture interaction, fleeing suspects, and personality idling.
3. **Stage 3: WhatsApp-Style Live Chat & Voice Messages**
   - Add instant voice note recording with waveform playback to `ChatTab.tsx`.
   - Implement message editing and message deletion with real-time room sync.
4. **Stage 4: Top Announcement Banner & Pluggable TTS Narration**
   - Build top notification banner for dramatic game announcements and phase changes.
   - Configure `lib/narrationEngine.ts` with pluggable external TTS endpoint configuration.
5. **Stage 5: Split-Screen Viewport Ergonomics & Testing**
   - Implement Fullscreen 3D Arena, Fullscreen Chat, and 50/50 split toggles.
   - Test room creation, bot hiring, day/night cycles, voting, and audio playback.
   - Verify build with `compile_applet`.
