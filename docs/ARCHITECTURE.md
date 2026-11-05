# AddaRoom System Architecture

## Overview

AddaRoom is designed as a **free-first, open-source, mobile-first WebRTC hangout application** for small groups of 2 to 6 people.

```
                              ┌──────────────────────────┐
                              │     Client Browser       │
                              │  (Next.js / LiveKit SDK) │
                              └─────┬──────────────┬─────┘
                                    │              │
                   HTTPS / JSON API │              │ WebRTC (UDP/TCP)
                   (Room management,│              │ Audio / Video /
                    Anonymous Auth) │              │ Screen / Data Packets
                                    ▼              ▼
                     ┌──────────────────┐    ┌──────────────────────┐
                     │     Next.js      │    │ LiveKit Media Server │
                     │ Application Node │    │    (Open Source)     │
                     └─────────┬────────┘    └──────────────────────┘
                               │
               SQL Pool (Auth, │
               Capacity Locks) │
                               ▼
                     ┌──────────────────┐
                     │ PostgreSQL DB /  │
                     │  Memory Fallback │
                     └──────────────────┘
```

---

## 1. Realtime Media: Selective Forwarding Unit (SFU)

Unlike peer-to-peer (P2P) mesh architectures where each participant sends $N-1$ video streams to every other participant, AddaRoom leverages **LiveKit Open Source Server** as an SFU:
- Each participant uploads their audio and video stream once.
- The LiveKit SFU routes tracks to subscribers according to viewport needs and bandwidth.
- Supports **Adaptive Streaming** (dynamic simulcast) and **Dynacast** to preserve audio quality and reduce packet loss on weaker network connections.

---

## 2. Realtime Data Layer & Screen Chat Overlay

- Chat messages, emoji reactions, typing indicators, and host actions are transmitted through **LiveKit Realtime Data Packets** over WebRTC data channels.
- Zero extra WebSocket server overhead or database write traffic for ephemeral chats and reactions.
- The **Live Screen Chat Overlay** renders incoming messages as floating translucent bubbles over the shared screen element in DOM space without modifying or re-encoding the video canvas.

---

## 3. Database & Capacity Management

- **Database**: PostgreSQL with Drizzle ORM.
- **Strict Capacity Enforcement**: Exactly 2, 3, 4, or 6 people.
- Uses database row locks (`SELECT ... FOR UPDATE`) in transactions to prevent concurrent join race conditions from exceeding maximum room capacity.
- The 7th participant is rejected with a 409 Conflict error (`ROOM_FULL`).

---

## 4. Security & Anonymous Session Model

1. **No User Registration**: No passwords, email addresses, or phone numbers are stored.
2. **Cryptographic Session Secret**: On room creation or join, the server generates a cryptographically random 256-bit session secret.
3. **Database Salt & Hash**: The server stores only the SHA-256 hash of this session secret.
4. **Server-Side Host Authorization**: Any administrative action (ending room, locking room, kicking participant) requires the host session secret and is authenticated by the server before executing.
5. **Short-Lived LiveKit Access Tokens**: LiveKit tokens are minted by the Next.js backend with a 4-hour TTL and restricted permissions.

