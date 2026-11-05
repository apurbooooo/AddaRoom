# Testing Guide

AddaRoom includes unit tests powered by **Vitest**. There are no live PostgreSQL or LiveKit integration tests in the current suite.

---

## Running Tests

Run the full test suite once:
```bash
pnpm test
```

Run tests in watch mode during development:
```bash
pnpm test:watch
```

---

## Verified Test Cases

The test suite covers the core application lifecycle and invariants:

1. **Room Creation & Host Association**:
   - Generates unpredictable 10-character codes (`xxxxx-xxxxx`, about 49.5 bits from the configured alphabet).
   - Assigns creator as verified host with hashed session credentials.
2. **Strict Capacity Enforcement (2, 3, 4, 6)**:
   - Verifies that 2-person rooms reject a 3rd participant.
   - Verifies that 6-person rooms accept exactly 6 participants and reject a 7th participant with `RoomFullError` (HTTP 409).
3. **Room Lock Protection**:
   - Locked rooms reject incoming joins with `RoomLockedError` (HTTP 403).
4. **Room Expiration & Termination**:
   - Ended rooms reject joins with `RoomEndedError` (HTTP 410).
5. **Host Privileges & Transfer**:
   - Host transfer safely promotes a new member and updates room ownership.
6. **In-memory Capacity Concurrency and Host Transfer Boundaries**:
   - Concurrent joins cannot exceed the memory store capacity.
   - Host transfer rejects a participant from another room.
7. **Screen-share Capture Presets**:
   - Checks requested 1080p/30, optional 1080p/60, and browser-default Auto capture settings.
8. **Session Resumption & Timing-Safe Verification**:
   - Ensures valid session secrets can resume disconnected participants, while invalid secrets are rejected.
9. **Input Validation**:
   - Enforces Zod schemas for titles, display names, and allowed capacity values.

