# Testing Guide

AddaRoom includes comprehensive unit and integration testing powered by **Vitest**.

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
   - Generates unpredictable 8-character codes (`adda-xxxx-yyyy`).
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
6. **Session Resumption & Timing-Safe Verification**:
   - Ensures valid session secrets can resume disconnected participants, while invalid secrets are rejected.
7. **Input Validation**:
   - Enforces Zod schemas for titles, display names, and allowed capacity values.
