# WhatsApp-Style Realtime Chat & Independent Live Audio Calling Engine

A comprehensive, production-grade architectural specification and step-by-step implementation blueprint to transform the in-game deliberation system into an ultra-fast, WhatsApp-caliber messaging suite with date navigation, read receipts, silent multi-message deletion, full Markdown rendering, and an independent floating WebRTC group audio call system tailored for the "Night Has Come" multiplayer survival deduction game.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following critical product and gameplay decisions were confirmed directly with the user during Phase 1:
> - **Live Audio Call Experience**: Audio calls will render as an independent, non-blocking floating overlay above the 3D room, allowing players to navigate the 3D map, inspect furniture, cast votes, and text in chat simultaneously.
> - **Game Rule Enforcement (Night Pause)**: Private live audio calls automatically pause and deafen when the game enters the `Night` phase to preserve deduction integrity and prevent cheating, and automatically resume or notify players when `Morning` arrives.
> - **Date History Deletion Permission**: Only the Room Host or System Admin has authority to wipe all messages belonging to an entire date from the database and room clients.
> - **GIF & Sticker Ingestion**: Native keyboard media injection is fully supported (mobile Gboard/iOS keyboard GIF pickers, stickers, and clipboard image pasting), rendering high-fidelity media inline within the chat stream.
> - **Silent Delete-For-Everyone**: Messages deleted using "Delete for Everyone" are wiped completely from the database and DOM with zero trace. The standard WhatsApp `"This message was deleted"` placeholder is strictly suppressed.

---

## 1. Overview & Core Concept

### What It Delivers
This upgrade replaces the basic linear chat with a full-featured, persistent, ultra-fast real-time communication platform built on top of Supabase Realtime broadcast channels and persistent PostgreSQL tables, coupled with a browser-native WebRTC peer-to-peer audio mesh network.

### Target Audience & Persona
Players engaging in high-stakes social deduction where timing, voice tone, whispered alliances, and fast text deliberations dictate life or death. The communication system must feel instant, tactile, and reliable on both mobile and desktop viewports.

### Key Value Delivered
1. **Fluid Deliberation**: Instant typing and audio-recording indicators build dramatic suspense ("Zahid is typing...", "Min-woo is recording a voice note...").
2. **Effortless History Navigation**: When deliberations span days or hundreds of messages, a sticky header dropdown catalogs all dates with conversational labels (`Today`, `Yesterday`, `Tomorrow`, or `Oct 24, 2026`) and triggers smooth auto-scrolling to any point in the timeline.
3. **Pristine Message Control**: Full Markdown typography, WhatsApp-authentic read ticks (gray single check, gray double check, blue double check), inline editing, and silent multi-message deletion without annoying ghost placeholders.
4. **Independent Floating Calls**: Small-group secret audio calls (2 or more players) that float seamlessly over the 3D gameboard with active speaker indicators, mute/unmute, and speaker toggles.

---

## 2. User Experience & Visual Design

### Key User Flows

#### Flow 1: WhatsApp-Style Messaging & Typing Presence
1. When a player begins typing into the input box, a debounced presence signal broadcasts `is_typing: true` with a 2-second heartbeat.
2. Other players see an animated indicator in the chat subheader: `Zahid is typing...` (or `Zahid and 2 others are typing...`).
3. If a player holds the mic button to record a voice note, the indicator instantly shifts to `Zahid is recording audio...` with a pulsing red microphone icon.
4. Messages display real-time timestamps (`10:42 AM`) and read tick indicators:
   - **One Gray Check (✓)**: Successfully sent and stored in database.
   - **Two Gray Checks (✓✓)**: Broadcast and received by connected room participants.
   - **Two Blue Checks (✓✓)**: Read by active participants in the deliberation viewport.

#### Flow 2: Date Jump Dropdown & Bulk Date History Deletion
1. In the upper chat bar, a calendar/clock dropdown trigger displays the currently visible date context.
2. Tapping the trigger opens a frosted dark popover listing all dates present in the conversation history:
   - Labeled intelligently: `Today`, `Yesterday`, `Tomorrow` (if forward-dated), or `Wednesday, Oct 24, 2026`.
   - Selecting a date smoothly scrolls the chat list directly to the first message of that target date.
3. **Admin/Host Date Deletion**: If the current user is the Room Host or Admin, long-pressing any date item in the dropdown highlights a red trash icon with a confirmation modal: `Delete all messages from [Date]?`.
4. Upon confirmation, all messages for that date are purged from the database and instantly removed from every player's chat viewport in real time.

#### Flow 3: Multi-Select Message Actions & Silent Deletion
1. Long-pressing any message bubble (or tapping the multi-select toggle) activates **Selection Mode**.
2. The standard chat header transforms into a high-contrast Selection Action Bar:
   - Displays selected message counter (`3 selected`).
   - Action buttons: `Copy Text`, `Select All`, `Cancel`, and `Delete (Trash)`.
3. Selecting `Delete` opens an action sheet:
   - If only own messages are selected: Offers `Delete for me` and `Delete for everyone`.
   - If messages from others are included: `Delete for everyone` is restricted only to own messages (or allowed completely if the user is Room Admin).
4. `Delete for everyone` issues a persistent batch delete request to `/api/delete-messages` and broadcasts a real-time `client_message_purge` event.
5. All target messages vanish completely with a swift fade/collapse animation. No `"This message was deleted"` placeholder is ever shown.

#### Flow 4: Keyboard Media (Emojis, Stickers, Animated GIFs)
1. The text input supports standard OS and mobile keyboard inputs (iOS emoji/GIF panel, Android Gboard GIF search).
2. Direct image/GIF file drops and clipboard pastes (`Ctrl+V` / `Cmd+V`) are intercepted:
   - Validated for image/gif formats under 5MB.
   - Rendered inline within the chat stream with rounded corners, loading skeletons, and expand-to-fullscreen capabilities.
3. Message text renders full GitHub-flavored Markdown:
   - Bold (`**text**`), italic (`*text*`), strikethrough (`~~text~~`), inline code (` `code` `), blockquotes (`> text`), and bulleted lists.

#### Flow 5: Floating Live Group Audio Call
1. In the chat action bar, a prominent `Live Audio Call` (Phone/Headset) button allows initiating a call.
2. Clicking it opens a player selection modal displaying all living room participants.
3. The host checks 2 or more players and clicks `Start Live Call`.
4. Selected players receive a non-intrusive floating incoming call banner with ring chime: `Zahid is calling... [Join Call] [Decline]`.
5. Upon accepting, a compact, draggable floating call card docks to the corner of the screen:
   - **Controls**: Mute Microphone, Deafen Speaker, Add Participant, and End/Leave Call.
   - **Visualizer**: Compact circular avatars with a dynamic green soundwave border that pulses whenever the participant speaks (using Web Audio API `AudioContext` frequency analysis).
6. **Independence**: The player can minimize the call card to a compact pill indicator and continue walking in 3D with the virtual joystick, inspecting furniture, and chatting.
7. **Night Curfew Pause**: As soon as the room phase shifts to `Night`, the call automatically mutes all streams and displays a curfew indicator: `⚠️ Call paused during Night Curfew`. Streams automatically unmute when `Morning` arrives.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Supabase Realtime Channels vs External WebSocket Server
- **Chosen Approach**: Leverage Supabase Realtime broadcast channels (`supabase.channel('chat:roomId')`) for ephemeral signaling (typing status, recording status, read receipts, WebRTC SDP offers/answers/ICE candidates, and purge events), coupled with database tables (`messages`, `message_reads`, `room_calls`) for persistent storage.
- **Why**: Keeps all real-time communication aligned with the existing project infrastructure, avoids introducing new port conflicts or separate backend daemons, and delivers sub-50ms peer signaling within the Next.js App Router environment.
- **Alternatives Considered**: Socket.io on a custom Node server was rejected because Next.js App Router serverless routes cannot host long-lived stateful socket listeners without a dedicated Express server rewrite.

### Decision 2: WebRTC Peer Mesh for Live Audio
- **Chosen Approach**: Use native browser `RTCPeerConnection` in a full mesh topology for small group calls (2 to 5 players) with Supabase broadcast channels acting as the signaling intermediary.
- **Why**: Delivers zero-latency, studio-quality, encrypted peer-to-peer voice without requiring expensive cloud media servers (SFU/MCU). WebRTC audio runs completely in background audio threads without freezing React DOM rendering or Three.js canvas frames.
- **Fallback**: If peer connection fails (strict NAT/firewall), fallback to high-frequency audio chunk broadcast via Supabase Realtime.

### Decision 3: Silent Message Purge vs WhatsApp Legacy Placeholders
- **Chosen Approach**: Fully remove deleted message objects from client memory and purge the database record.
- **Why**: The user explicitly requested removing the `"This message was deleted"` bubble. In a thriller deduction game, leaving placeholder markers clutters the chat, whereas a silent delete allows stealthy retracting of slips or accidental role leaks.

### Decision 4: Date Aggregation & Direct Smooth Scrolling
- **Chosen Approach**: Dynamically group loaded messages by calendar day string (`YYYY-MM-DD`). Generate the dropdown list ordered chronologically with relative labels (`Today`, `Yesterday`).
- **Why**: Requires zero additional database queries. Scrolling is achieved via `element.scrollIntoView({ behavior: 'smooth', block: 'start' })` targeted at date marker divider IDs.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                CLIENT VIEWPORT HUB                                     │
├───────────────────────────────────────────┬────────────────────────────────────────────┤
│           3D GAMEPLAY VIEWPORT            │         WHATSAPP DELIBERATION CHAT         │
│  • Three.js 3D Room & Joystick Controls   │  • Top Bar: Date Jump Dropdown & Calls     │
│  • Independent Character Movement         │  • Dynamic Date Dividers (Today/Yesterday) │
│  • Collision sliding & night lighting     │  • Message Stream with Markdown & Ticks    │
│                                           │  • Long-Press Context Menu & Multi-Select  │
│                                           │  • Native Keyboard GIF & Sticker Ingestion │
│                                           │  • Realtime Typing & Recording Statuses    │
└─────────────────────┬─────────────────────┴──────────────────────┬─────────────────────┘
                      │                                            │
                      ▼                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        FLOATING INDEPENDENT AUDIO CALL OVERLAY                         │
│  • Non-blocking draggable HUD with minimize to pill                                    │
│  • Active speaker frequency visualizer (Web Audio API)                                 │
│  • Mute mic / Deafen speaker / End call / Add players                                  │
│  • Automatic Night Curfew Deafen Guard                                                 │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                             SUPABASE REALTIME & DATA BUS                               │
├───────────────────────────────────────────┬────────────────────────────────────────────┤
│            PERSISTENT STORAGE             │          REALTIME BROADCAST BUS            │
│  • messages (id, room_id, sender_id, text,│  • 'typing_status' (user, is_typing)       │
│    media_url, type, created_at, read_by)  │  • 'recording_status' (user, is_recording) │
│  • room_calls (id, room_id, caller_id,    │  • 'read_receipt' (message_id, reader_id)  │
│    participants, active_phase)            │  • 'call_signal' (SDP offer/answer, ICE)   │
│  • /api/send-message & /api/delete-message│  • 'purge_messages' (message_ids, date)    │
└───────────────────────────────────────────┴────────────────────────────────────────────┘
```

### Database Schema Updates & Extensions

1. **`messages` table enhancements**:
   - `id`: `TEXT PRIMARY KEY` (UUID or nanoid)
   - `room_id`: `TEXT NOT NULL`
   - `sender_id`: `TEXT NOT NULL`
   - `sender_name`: `TEXT NOT NULL`
   - `sender_avatar`: `TEXT`
   - `personality`: `TEXT`
   - `message`: `TEXT`
   - `message_type`: `'text' | 'voice' | 'image' | 'gif' | 'system'`
   - `audio_url`: `TEXT`
   - `audio_duration`: `INTEGER`
   - `media_url`: `TEXT` (for stickers/GIFs/images)
   - `read_by`: `TEXT[]` (array of player IDs who have rendered/seen the message)
   - `created_at`: `TIMESTAMPTZ DEFAULT NOW()`
   - `is_edited`: `BOOLEAN DEFAULT FALSE`

2. **`room_calls` table**:
   - `id`: `TEXT PRIMARY KEY`
   - `room_id`: `TEXT NOT NULL`
   - `initiator_id`: `TEXT NOT NULL`
   - `initiator_name`: `TEXT NOT NULL`
   - `participant_ids`: `TEXT[]`
   - `status`: `'ringing' | 'active' | 'ended'`
   - `created_at`: `TIMESTAMPTZ DEFAULT NOW()`

---

## 5. Ordered Step-by-Step Implementation Stages

The entire implementation is broken into 6 distinct, sequential, verifiable stages. You can pause or resume at any stage:

### 🟩 Stage 1: Realtime Typing, Recording Indicators & WhatsApp Read Ticks
- **Goals**:
  - Implement broadcast event handling for `typing_start`, `typing_stop`, `recording_start`, and `recording_stop`.
  - Add visual typing banner in chat header: `[User] is typing...` with animated ellipsis dots.
  - Add visual recording banner: `[User] is recording audio...` with a pulsing red wave.
  - Implement read receipts (`read_by` array):
    - Single check `✓` (sent to server).
    - Double check `✓✓` gray (delivered to room).
    - Double check `✓✓` blue (seen by active participants).
  - Add debounced presence tracker in `useChat.ts` to automatically emit `seen` events when messages appear in the viewport.

### 🟩 Stage 2: Date Dividers & Date Jump Navigation Dropdown
- **Goals**:
  - Implement date grouping algorithm that buckets messages into calendar days.
  - Render sticky date badges in the stream labeled `Today`, `Yesterday`, or formatted calendar date with clean typographic separators.
  - Build the **Date Jump Dropdown** in the chat header bar:
    - Lists all conversation dates with message counts.
    - Clicking any date initiates a smooth auto-scroll to the top marker of that date.
  - Implement Host/Admin **Date Purge**:
    - Long-pressing a date in the dropdown reveals a red trash icon.
    - If user is room host or admin, clicking trash prompts confirmation and calls `/api/delete-messages?date=YYYY-MM-DD`.
    - Purges all records for that date from the database and broadcasts a realtime `date_purged` event to all clients.

### 🟩 Stage 3: Full Markdown Rendering & Keyboard Media (GIFs, Stickers, Images)
- **Goals**:
  - Upgrade message bubble rendering to support full GitHub Markdown (bold, italic, strikethrough, blockquotes, inline code, links).
  - Enable keyboard media ingestion:
    - Listen for mobile/OS keyboard GIF insertion events in the chat input.
    - Add drag-and-drop and clipboard paste (`onPaste`) listener for image/GIF payloads.
    - Render media bubbles with rounded corners, aspect preservation, and tap-to-expand modal.

### 🟩 Stage 4: Multi-Select Mode & Silent Delete-For-Everyone
- **Goals**:
  - Add long-press handler on message bubbles (mobile) and right-click / hover context menu (desktop) to toggle **Selection Mode**.
  - Replace normal chat header with the **Multi-Select Action Bar**:
    - Counter of selected messages (`N selected`).
    - `Select All` and `Deselect All` triggers.
    - `Copy Text` for combining selected text.
    - `Delete Selected` trigger.
  - Create `/api/delete-messages` backend route supporting bulk ID arrays.
  - Implement strict permission enforcement:
    - Normal players can only delete their own messages for everyone.
    - Room Host / Admin can delete any message.
  - Purge deleted items completely from both database and local state without showing `"This message was deleted"` boxes.

### 🟩 Stage 5: Floating Independent Live Audio Calling Engine
- **Goals**:
  - Build `LiveCallModal.tsx`: Select 2 or more players from the room roster to initiate a live audio call.
  - Build incoming call toast / ringing modal for target recipients with ring audio and `Accept` / `Decline` actions.
  - Build WebRTC signaling manager over Supabase Realtime channel (`sdp_offer`, `sdp_answer`, `ice_candidate`).
  - Build `FloatingCallOverlay.tsx`:
    - Non-blocking, draggable floating card docked above the 3D gameboard and chat.
    - Minimizable to a compact pill indicator in the top corner.
    - Live audio stream connected via Web Audio API frequency analyzer to display pulsing green/red sound rings around speaking participants.
    - Mute Microphone toggle, Deafen Audio toggle, Add Participant trigger, and Leave Call button.
  - Implement **Night Curfew Deafen Guard**:
    - Watches `gameState.phase`.
    - When phase switches to `Night`, automatically mutes microphone and deafens call output, rendering an alert badge: `Curfew active: Calls muted during Night`.
    - Automatically restores audio when phase advances to `Morning`.

### 🟩 Stage 6: End-to-End Verification & Performance Polish
- **Goals**:
  - Verify zero lag or dropped frames in the 3D Three.js viewport during active audio streaming and rapid message posting.
  - Test multi-client edge cases: network disconnect/reconnect, simultaneous typing, multi-message deletion sync across all devices, and call handoffs.
  - Compile the complete application and verify zero TypeScript, ESLint, or runtime errors.

---

## 6. Inspirations & References

- **"Night Has Come" (Korean Thriller Drama)**: The tension of secret pacts, late-night whispered phone calls, and sudden curfew enforcement inspired the independent floating call feature and the automatic Night Curfew audio blackout.
- **WhatsApp**: Interaction paradigms including double blue check marks, instant recording/typing status broadcasts, long-press multi-select toolbars, and date categorization.
- **Discord / Clubhouse**: Floating audio overlay ergonomics that allow users to talk freely while navigating another primary interface without interruption.
