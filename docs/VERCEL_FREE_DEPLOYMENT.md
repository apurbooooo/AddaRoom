# Mode B — Optional Free Cloud Deployment Guide

AddaRoom supports deployment using standard free cloud tiers. This mode is completely optional and meant for testing without dedicated VPS infrastructure.

---

## Architecture Components

1. **Next.js Web Application**: Hosted on **Vercel Hobby** (Free)
2. **Database**: Hosted on **Supabase Free** or **Neon PostgreSQL** (Free)
3. **WebRTC Media SFU**: Hosted on **LiveKit Cloud Build** (Free Developer Tier)

> [!IMPORTANT]
> **No WebRTC on Vercel**: Vercel does not host the WebRTC SFU media server. Browser WebRTC media flows directly between the participant's device and the LiveKit media server.

---

## Free Tier Quotas & Provider Restrictions

| Provider | Free Quota | Considerations |
|----------|------------|----------------|
| **Vercel Hobby** | 100 GB bandwidth, serverless execution limits | Non-commercial hobby use |
| **Supabase Free** | 500 MB database, 2 projects | Pauses after 7 days of inactivity |
| **LiveKit Cloud Build** | 50 GB bandwidth, ~100 participant-hours / month | Sufficient for 2-6 friends weekly hangouts |

---

## Step-by-Step Setup

### 1. Database Setup (Supabase / Neon)
1. Create a free project at [supabase.com](https://supabase.com).
2. Go to **Project Settings > Database > Connection String**.
3. Select **URI** with **Session Connection Pooling** (`pgbouncer=true` or port `6543`).

### 2. LiveKit Cloud Setup
1. Create a free account at [cloud.livekit.io](https://cloud.livekit.io).
2. Create a new project.
3. Note your project credentials:
   - WebSocket URL (e.g., `wss://yourproject.livekit.cloud`)
   - API Key
   - API Secret

### 3. Deploy to Vercel
1. Push your repository to GitHub.
2. Import the project into Vercel.
3. Configure the following environment variables in Vercel:
   ```env
   DATABASE_URL=postgres://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
   LIVEKIT_URL=https://yourproject.livekit.cloud
   NEXT_PUBLIC_LIVEKIT_URL=wss://yourproject.livekit.cloud
   LIVEKIT_API_KEY=your_api_key
   LIVEKIT_API_SECRET=your_api_secret
   ```
4. Deploy!
