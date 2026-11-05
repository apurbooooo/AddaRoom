# Mobile Browser Capabilities & Honest Fallbacks

Mobile responsiveness is a first-class priority in AddaRoom. However, web browsers on mobile platforms operate under OS-level sandboxes and restrictions.

---

## Screen Sharing Support Matrix

| Platform / Browser | Screen Capture Support | System Audio Support | Fallback Behavior |
|--------------------|------------------------|----------------------|-------------------|
| **Desktop (Chrome, Edge, Brave)** | Full (Screen, Window, Tab) | Full (Tab & System) | None needed (up to 1080p 60fps) |
| **Desktop (Firefox, Safari)** | Full (Screen, Window) | Limited by OS | Standard capture |
| **Android (Chrome 107+)** | Full (Device Screen) | Mic only / restricted | Runtime detected; shares screen cleanly |
| **iOS (Safari / WebKit)** | Unsupported in WebKit | Unsupported | Notified with friendly toast; can watch other screens & talk |
| **iOS (Chrome / Firefox)** | Unsupported (uses WebKit) | Unsupported | Notified with friendly toast; can watch other screens & talk |

---

## Technical Reasoning

- **Apple iOS / iPadOS**: Apple does not expose `navigator.mediaDevices.getDisplayMedia` in WebKit browsers for security reasons. Screen recording on iOS requires native app compilation with an `RPBroadcastSampleHandler` extension.
- **Audio Capture on Android**: Mobile Chrome supports capturing the visual screen surface, but restricts arbitrary system audio loopback to prevent eavesdropping.

## AddaRoom's Implementation

1. **Runtime Feature Detection**: Rather than relying on fragile User-Agent checks, AddaRoom checks:
   ```ts
   navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === "function"
   ```
2. **Honest Fallbacks**: If a user on an unsupported mobile browser clicks the screen share button, a non-blocking toast informs them:
   > *"Screen sharing is not supported by your mobile browser. You can still talk, view shared screens, and chat!"*
3. **Flawless Viewer Experience**: Mobile viewers can watch desktop screen shares in crisp resolution with floating live chat overlay, fullscreen mode, and touch controls.
