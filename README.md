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

---

## ✨ Features

- 🎙️ **Crystal-Clear Voice & Video**: Powered by LiveKit Open Source SFU with echo cancellation, noise suppression, active speaker detection, and device switching.
- 🖥️ **High-Performance Screen Sharing**: Target 1080p @ 30–60 FPS with adaptive streaming and shared system/tab audio.
- 💬 **Live Screen Chat Overlay**: Chat normally in the side drawer, or float live semi-transparent messages directly over shared video with customizable position, opacity, and fade-out timer.
- ⚡ **Realtime Social Reactions**: Send floating emoji reactions (❤️, 😂, 👏, 😮, 👍, 🔥) and raise your hand.
- 📊 **Real Network Quality Health**: Inspect actual WebRTC SFU stats: RTT, packet loss, jitter, bitrate, actual incoming resolution, and FPS.
- 👑 **Server-Authorized Host Controls**: Change room title, lock/unlock entry, mute participants, transfer host role, and end the room for everyone.
- 📱 **Mobile-First Responsive Layout**: Optimized touch controls, mobile drawer for chat, and honest runtime detection for mobile browser screen sharing limitations.
- 🔐 **Ephemeral Privacy**: Chat messages and reactions are exchanged over WebRTC data channels and are never permanently stored in databases.

---

## 🏗️ Architecture

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons.
- **Realtime Media**: LiveKit Open Source Server (Apache 2.0 SFU) & LiveKit Web SDK.
- **Database**: PostgreSQL with Drizzle ORM (with in-memory fallback for rapid testing).
- **Deployment**: Docker Compose with Caddy reverse proxy for automated Let's Encrypt HTTPS.

---

## 🚀 Quick Start (Local Development)

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
Open [http://localhost:3000](http://localhost:3000) in your browser.

> [!NOTE]
> During rapid local UI testing, AddaRoom automatically uses an in-memory database store if `DATABASE_URL` is omitted. For full media SFU testing, launch the PostgreSQL and LiveKit containers using Docker Compose.

---

## 🐳 Self-Hosting with Docker Compose (Mode A — Default)

To run the complete production stack (Next.js, PostgreSQL, LiveKit SFU, and Caddy):

```bash
# 1. Start all services
docker compose up -d

# 2. Start with automated HTTPS Caddy profile
docker compose --profile prod up -d --build
```

Refer to [docs/SELF_HOSTING.md](docs/SELF_HOSTING.md) for full port mappings, firewall configuration, and public IP requirements.

---

## ☁️ Optional Free Cloud Deployment (Mode B)

AddaRoom can also run on free tiers:
- **Web App**: Vercel Hobby
- **Database**: Supabase Free / Neon PostgreSQL
- **Media SFU**: LiveKit Cloud Build (free developer tier)

See [docs/VERCEL_FREE_DEPLOYMENT.md](docs/VERCEL_FREE_DEPLOYMENT.md) for step-by-step setup and honest quota explanations.

---

## 🧪 Testing

AddaRoom comes with comprehensive tests covering room creation, capacity enforcement (2, 3, 4, 6), 7th participant rejection, host security, and token verification:

```bash
pnpm test
```

---

## 📚 Documentation

- [System Architecture](docs/ARCHITECTURE.md)
- [Self-Hosting Guide](docs/SELF_HOSTING.md)
- [Vercel Free Deployment](docs/VERCEL_FREE_DEPLOYMENT.md)
- [Mobile Limitations & Fallbacks](docs/MOBILE_LIMITATIONS.md)
- [Security & Privacy](docs/SECURITY.md)
- [Testing Guide](docs/TESTING.md)

---

## 📄 License

Released under the [MIT License](LICENSE).
