# Security & Privacy Model

AddaRoom keeps host authorization and room capacity checks on the server and uses an **ephemeral-first privacy model**.

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

- LiveKit JWT access tokens are signed on the server with a 10-minute TTL. This limits stale-token rejoin exposure on self-hosted LiveKit, where token revocation is not available.
- Permissions (`canPublish`, `canPublishData`, `roomAdmin`) are granted strictly based on verified database roles.
- When a participant is removed by the host, the server immediately triggers `removeParticipant` on the LiveKit server to disconnect media tracks.

---

## 4. Atomic Capacity Enforcement

- Room capacity limits (2, 3, 4, 6) are enforced in Postgres transactions using a room row lock (`SELECT ... FOR UPDATE`). The in-memory development store checks and inserts synchronously within a process.
- Concurrent join requests cannot exceed maximum room limits.

## 5. Room code guessing and rate limits

Generated codes use about 49.5 bits of randomness with unbiased character selection. Room creation is limited to 5 requests and room joins to 20 requests per 15 minutes per client address. PostgreSQL deployments share these limits across app instances; the in-memory development store limits only within its process. Set a unique `RATE_LIMIT_SECRET`, and make sure the app trusts client-IP headers only from your configured proxy.

## 6. Production secrets and storage

- Production refuses to initialize without `DATABASE_URL`, LiveKit credentials, and a unique rate-limit key; development credentials are not accepted in production.
- Set a unique PostgreSQL password, API key, and API secret before deployment. Keep `.env` out of version control.
- The database stores anonymous names, avatars, room metadata, and session-secret hashes. Chat and reactions are sent over LiveKit data channels and are not persisted by AddaRoom.

---

## 7. Ephemeral Media & Data

- Chat messages and reactions are exchanged over peer WebRTC data channels via the LiveKit SFU.
- Chat messages are **not** persisted to disk or databases. When the room concludes, all communications disappear permanently.

