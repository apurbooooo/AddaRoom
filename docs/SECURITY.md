# Security & Privacy Model

AddaRoom is engineered around a **zero-trust client architecture** and an **ephemeral-first privacy policy**.

---

## 1. Anonymous Session Security

- **No User Credentials Stored**: No passwords, emails, or personal identification stored in databases.
- **Random Participant IDs**: Unique IDs generated using Node.js `crypto.randomBytes`.
- **Session Secret Hashing**: When a user creates or joins a room, a 256-bit random session secret is generated. Only the SHA-256 hash is saved in the database.
- **Constant-Time Verification**: Session secret authentication uses `crypto.timingSafeEqual` to prevent side-channel timing attacks.

---

## 2. Server-Enforced Host Privilege

The client browser is never trusted to assert host privileges:
- Host actions (`/lock`, `/title`, `/moderate`, `/end`) require `participantId` and `sessionSecret`.
- The server validates that the session matches the room's registered host before executing.
- Non-host users attempting administrative requests receive HTTP 403 Forbidden.

---

## 3. Short-Lived Media Tokens

- LiveKit JWT access tokens are signed on the server with a short TTL (4 hours).
- Permissions (`canPublish`, `canPublishData`, `roomAdmin`) are granted strictly based on verified database roles.
- When a participant is removed by the host, the server immediately triggers `removeParticipant` on the LiveKit server to disconnect media tracks.

---

## 4. Atomic Capacity Enforcement

- Room capacity limits (2, 3, 4, 6) are strictly enforced inside database transactions using row-level locking (`SELECT ... FOR UPDATE`).
- Concurrent join requests cannot exceed maximum room limits.

---

## 5. Ephemeral Media & Data

- Chat messages and reactions are exchanged over peer WebRTC data channels via the LiveKit SFU.
- Chat messages are **not** persisted to disk or databases. When the room concludes, all communications disappear permanently.
