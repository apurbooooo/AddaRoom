# AddaRoom Premium Frontend Redesign Plan

## Scope and implementation approach

AddaRoom remains the existing Next.js 15 / React 19 application. This work is frontend-only: preserve API routes, Drizzle schemas, session storage, LiveKit connection lifecycle, data-channel payloads, and all existing room controls. The implementation will refresh the visual system and presentation layers in place rather than introducing a replacement app.

The first pass targets `src/app/page.tsx` for the landing page and animated product demonstration, `src/app/globals.css` for the shared visual language and motion primitives, and the existing modal/join/room chrome classes for consistent surfaces. Existing avatar assets are reused. The real room view continues to render the existing `ParticipantGrid`, `MediaStage`, `ChatPanel`, `RoomControlBar`, drawers, and dialogs.

## Project structure

- `src/app/page.tsx`: landing page, create-room entry, join-code entry, and product demonstration.
- `src/app/join/[code]/page.tsx`: room lookup and real join flow.
- `src/app/room/[code]/page.tsx`: persisted session resume and LiveKit token handoff.
- `src/components/room-view.tsx`: live room orchestration; behavior remains unchanged.
- `src/components/media/*`: participant tiles and screen-share stage; behavior remains unchanged.
- `src/components/chat/*`: ephemeral chat and screen-share overlay; behavior remains unchanged.
- `src/components/create-room-modal.tsx`, `join-room-card.tsx`: real form flows with refreshed presentation.
- `src/components/ui/animated-background.tsx`: ambient layered background primitive.
- `src/lib`, `src/server`: validation, sessions, data channels, database, and LiveKit integration; no redesign changes required.
- `public/avatars/*`: existing custom avatar catalog reused by UI and demo.

## Design direction

Three candidate directions were considered: **Cinematic Signal** (0.72), **Lime Terminal Lounge** (0.06), and **Soft Neon Arcade** (0.04). Chosen direction: **Cinematic Signal**.

- **Design Movement:** premium dark social product with cinematic SaaS restraint and subtle broadcast-console cues.
- **Core Principles:** intentional depth, high-contrast hierarchy, motion that explains state, and calm surfaces around live content.
- **Color Philosophy:** black is the room; warm white carries trust and readability; AddaRoom lime marks action and live presence; emerald is reserved for ambient atmosphere and healthy connection states.
- **Layout Paradigm:** editorial landing page with an offset, framed product stage; in-room UI remains utility-first with strong edge rails and a calm central canvas.
- **Signature Elements:** lime signal line, glassy command surfaces, and tiny live-status pulses.
- **Interaction Philosophy:** every hover, press, entry, and state change should feel like a signal being acknowledged, never like decoration competing with the task.
- **Animation:** CSS transforms/opacity, staggered product-demo steps, 20–40 second ambient movement, and reduced-motion fallbacks. No heavy video or WebGL.
- **Typography System:** system sans stack with tight display tracking for headings, generous body leading, and tabular/monospace accents only for room codes and metrics.
- **Brand Essence:** private digital living room for small friend groups; intimate, capable, and alive.
- **Brand Voice:** direct, warm, and quietly confident. Example lines: “Your people are one code away.” and “Make space for the good kind of noise.”
- **Wordmark & Logo:** retain the existing AddaRoom mark and lime signal motif rather than replacing brand assets.
- **Signature Brand Color:** `#BBFB2B` AddaRoom lime.

## Material constraints

Do not modify `.env.local`, secrets, backend schemas, authentication, API contracts, or LiveKit logic. Do not commit, push, deploy, or publish. Keep keyboard focus, touch targets, contrast, responsive widths from 320px through desktop, and `prefers-reduced-motion` support. Use only existing dependencies and assets unless a concrete gap appears.

## Delivery shape

Implement the landing/demo and shared visual system first, then harmonize create/join and room chrome. Validate with the existing Vitest suite, TypeScript/build checks, and a local browser smoke test where available. Report code checks separately from browser/device checks.
