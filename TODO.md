# AddaRoom Redesign TODO

## Premium landing page and product demonstration

- [ ] Preserve the existing AddaRoom brand identity: pure black or extremely dark charcoal background, `#BBFB2B` lime accent, warm-white primary text, muted grey secondary text, subtle emerald ambient lighting, premium dark glass surfaces, soft borders, refined shadows, controlled glow, cinematic dark atmosphere, sophisticated typography, smooth transitions, and subtle glassmorphism.
- [ ] Redesign the complete landing page with a large headline, short description, clear Create Room and Join Room actions, and a prominent animated product demonstration.
- [ ] Replace the static room preview with a self-contained responsive animated sequence that communicates room creation, invite-code joining, participant entry, chat and reactions, screen sharing becoming the main stage, participant avatars around the stage, and an incoming chat overlay.
- [ ] Keep the demonstration lightweight using CSS/SVG-style transforms and opacity, and ensure it works on mobile without obscuring the actions.

## Shared motion, accessibility, and responsive system

- [ ] Add polished navigation, button, modal, avatar selection, room-card, participant, chat, reaction, toast, loading, drawer, dropdown, and focus-state transitions without slowing interaction.
- [ ] Use CSS transforms and opacity where possible, avoid unnecessary dependencies and expensive re-renders, maintain readable contrast and comfortable touch targets, and respect `prefers-reduced-motion`.
- [ ] Support the requested 320px, 360px, 375px, 390px, 414px, 430px, and desktop widths without layout shifts.

## Create and join experiences

- [ ] Restyle Create Room and Join Room flows as premium dark interfaces with elegant modal transitions, clear hierarchy, refined inputs, existing custom avatar galleries, selected-avatar preview and feedback, capacity feedback, validation messaging, and proper mobile layouts.
- [ ] Preserve room creation, room joining, invite codes, room passwords, participant identity, and session persistence.

## Live room presentation

- [ ] Restyle the actual room interface, including participant grid, video tiles, camera-off states, speaking indicators, room header, chat panel, screen-sharing stage, screen-share chat overlay, participant roster, host controls, mobile control bar, drawers, and dialogs.
- [ ] Preserve LiveKit connection, voice/video, screen sharing and audio, chat, reactions, host moderation, Krisp noise cancellation, RTT indicators, mobile audio playback, and all existing room functionality.
- [ ] Keep shared content readable and avoid decorative animated layers over important screen-share content.

## Verification and delivery

- [ ] Run the existing test suite, TypeScript checks, and production build; fix introduced errors.
- [ ] Check landing and room interfaces at mobile and desktop widths, and test actual Create Room and Join Room flows where credentials/runtime support it.
- [ ] Clearly distinguish code checks, browser tests, and actual device tests.
- [ ] Do not modify `.env.local`, expose credentials, deploy/publish, commit, or push without explicit approval.
