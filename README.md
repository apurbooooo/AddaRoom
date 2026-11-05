# AddaRoom

<div align="center">
  <h3><strong>Your Circle. Your Room. Your Adda.</strong></h3>
  <p>A private, free-first, open-source online hangout platform for 2–6 friends to watch, talk, share, and connect.</p>
</div>

---

## 🌟 What is AddaRoom?

**AddaRoom** is an intimate, registration-free hangout application designed specifically for small friend groups. It brings together the warmth of a private voice hangout, a synchronized watch party, and clean screen-sharing with a signature **floating live chat overlay**.

- **No login, no password, no email**: Enter your name and pick an avatar emoji.
- **Intimate group sizes**: Strict server-enforced capacities (2, 3, 4, or 6 people).
- **Free-First & 100% Open Source**: Built with permissive open-source tools. No mandatory paid cloud subscriptions, no tracking, and no hidden credit cards.
- **Zero-Cost Remote Production**: Production runs on remote free-tier cloud services (Vercel + Supabase + LiveKit Cloud). Your personal PC is strictly for local development and testing.

---

## ✨ Features

- 🎙️ **Crystal-Clear Voice & Video**: Powered by LiveKit SFU with echo cancellation, noise suppression, active speaker detection, and device switching.
- 🖥️ **High-Performance Screen Sharing**: Target 1080p @ 30–60 FPS with adaptive streaming and shared system/tab audio.
- 💬 **Live Screen Chat Overlay**: Chat normally in the side drawer, or float live semi-transparent messages directly over shared video with customizable position, opacity, and fade-out timer.
- ⚡ **Realtime Social Reactions**: Send floating emoji reactions (❤️, 😂, 👏, 😮, 👍, 🔥) and raise your hand.
- 📊 **Real Network Quality Health**: Inspect actual WebRTC SFU stats: RTT, packet loss, jitter, bitrate, actual incoming resolution, and FPS.
- 👑 **Server-Authorized Host Controls**: Change room title, lock/unlock entry, mute participants, transfer host role, and end the room for everyone.
- ⏱️ **Free Cloud Quota Monitor**: Live session tracking in host controls with non-intrusive warnings when calls approach free-tier bounds (e.g. 90+ minutes).
- 📱 **Mobile-First Responsive Layout**: Optimized touch controls, mobile drawer for chat, and honest runtime detection for mobile browser screen sharing limitations.
- 🔐 **Ephemeral Privacy**: Chat messages and reactions are exchanged over WebRTC data channels and are never permanently stored in databases.

---

## 🏗️ Architecture

```
                      ┌──────────────────────────────────────┐
                      │            Client Browser            │
                      │        (Mobile / Tablet / PC)        │
                      └───────┬──────────────────────┬───────┘
                              │                      │
             HTTPS API / HTML │                      │ WebRTC Media
              (Next.js App)   │                      │ (Audio/Video/Screen/Data)
                              ▼                      ▼
                     ┌─────────────────┐    ┌──────────────────────┐
                     │  Vercel Hobby   │    │  LiveKit Cloud Build │
                     │  (Next.js App)  │    │  (Managed SFU Media) │
                     └────────┬────────┘    └──────────────────────┘
                              │
               SQL Pool (6543)│
                              ▼
                     ┌─────────────────┐
                     │  Supabase Free  │
                     │  (Postgres DB)  │
                     └─────────────────┘
```

- **Frontend & API**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons hosted on **Vercel Hobby**.
- **Realtime Media**: **LiveKit Cloud Build** (free developer tier with 50 GB egress & 100 participant-hours/month) & LiveKit Web SDK.
- **Database**: PostgreSQL with Drizzle ORM hosted on **Supabase Free** (Transaction pooler on port 6543).

---

## 💻 Local Development (Personal PC)

Your personal PC is used **only** for coding, testing, and git operations.

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/AddaRoom.git
cd AddaRoom
pnpm install
```

### 2. Configure Environment
```bash
cp .env.example .env.local
```

### 3. Run Development Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. During rapid local UI testing, an in-memory database store is used automatically when `DATABASE_URL` is omitted.

---

## 🚀 Remote Production Deployment (Recommended)

Production runs 100% remotely across free-tier managed providers:

1. **Supabase Free**: Run [`supabase/schema.sql`](supabase/schema.sql) in your Supabase SQL Editor.
2. **LiveKit Cloud Build**: Create a free project at [cloud.livekit.io](https://cloud.livekit.io) and retrieve your keys.
3. **Vercel Hobby**: Connect your GitHub repository to Vercel and paste environment variables.

👉 **Follow the complete step-by-step guide in [docs/PRODUCTION_DEPLOYMENT.md](docs/PRODUCTION_DEPLOYMENT.md).**

---

## ☁️ Future Remote VM Migration (Optional)

If your group ever outgrows managed free tiers, you can migrate to a dedicated **Remote Cloud VM** (e.g. Oracle Cloud Always Free 4 OCPU / 24GB ARM instance or remote VPS) using Docker Compose and Caddy.

👉 **See [docs/SELF_HOSTING.md](docs/SELF_HOSTING.md) for remote VM instructions.** *(Your personal PC is never used as a production server).*

---

## 🧪 Testing

AddaRoom comes with comprehensive tests covering room creation, capacity enforcement (2, 3, 4, 6), 7th participant rejection, host security, and token verification:

```bash
pnpm test
```

---

## 📚 Documentation

- [Production Deployment Guide](docs/PRODUCTION_DEPLOYMENT.md)
- [System Architecture](docs/ARCHITECTURE.md)
- [Future Remote VM Migration](docs/SELF_HOSTING.md)
- [Mobile Limitations & Fallbacks](docs/MOBILE_LIMITATIONS.md)
- [Security & Privacy](docs/SECURITY.md)
- [Testing Guide](docs/TESTING.md)

---

## 📄 License

Released under the [MIT License](LICENSE).
