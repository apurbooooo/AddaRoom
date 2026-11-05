# AddaRoom — Production Deployment Guide (Vercel + Supabase + LiveKit Cloud)

This is the **primary production architecture** for AddaRoom.

> [!IMPORTANT]
> **No Personal PC as Server**: Your personal computer is strictly for coding, local testing, and git operations. The live production application runs 100% on remote, zero-cost managed cloud infrastructure and remains online 24/7 without keeping your PC powered on.

---

## Architecture Overview

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

---

## 1. Provider Quotas & Free-Tier Rules

All three providers offer generous perpetual free tiers without credit card requirements or surprise billing:

| Service | Free Tier Allowance | What AddaRoom Consumes |
|---------|---------------------|------------------------|
| **Vercel Hobby** | 100 GB bandwidth / month, unlimited deployments | Lightweight static pages & serverless API routes |
| **Supabase Free** | 500 MB database, 2 projects, 50,000 monthly active users | Small room metadata tables (< 5 MB for thousands of sessions) |
| **LiveKit Cloud Build** | 50 GB egress / month, 100 participant-hours / month | Intimate 2–6 friends hangouts (realtime media & data channels) |

> [!NOTE]
> **Inactivity Policy**: Free Supabase projects pause after 7 consecutive days of zero database activity. If this happens, simply click "Restore" in your Supabase dashboard or leave an active test room running once a week.

---

## 2. Step 1: Setup Supabase Database

1. Sign up for free at [supabase.com](https://supabase.com).
2. Create a new organization and project (choose the region closest to your friend group).
3. Once the database is provisioned, click **SQL Editor** on the left menu.
4. Copy the entire contents of [`supabase/schema.sql`](../supabase/schema.sql), paste into the editor, and click **Run**.
5. Go to **Project Settings > Database > Connection string**.
6. Select the **URI** tab, choose **Mode: Transaction** (port `6543`), and copy the connection string.
   ```
   postgres://postgres.[YOUR_PROJECT_REF]:[YOUR_PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require
   ```

---

## 3. Step 2: Setup LiveKit Cloud Build

1. Sign up for free at [cloud.livekit.io](https://cloud.livekit.io).
2. Create a project named `addaroom`.
3. In the project dashboard, go to **Settings > Keys**.
4. Generate a new API Key and copy:
   - **WebSocket URL**: `wss://addaroom-xxxx.livekit.cloud`
   - **HTTP API URL**: `https://addaroom-xxxx.livekit.cloud`
   - **API Key**: `APIxxxxxxxx`
   - **API Secret**: `secretxxxxxxxx`

---

## 4. Step 3: Deploy to Vercel

1. Push your AddaRoom repository to your GitHub account:
   ```bash
   git remote add origin https://github.com/your-username/AddaRoom.git
   git push -u origin main
   ```
2. Log into [vercel.com](https://vercel.com) using your GitHub account.
3. Click **Add New > Project** and select your `AddaRoom` repository.
4. In the **Environment Variables** section, add the following variables:

| Key | Value | Description |
|-----|-------|-------------|
| `DATABASE_URL` | `postgres://postgres.[ref]:[pass]@...pooler.supabase.com:6543/postgres?sslmode=require` | Supabase Transaction Pooler URI |
| `LIVEKIT_URL` | `https://[YOUR_PROJECT].livekit.cloud` | LiveKit Server HTTP API URL |
| `NEXT_PUBLIC_LIVEKIT_URL` | `wss://[YOUR_PROJECT].livekit.cloud` | Browser WebRTC WebSocket URL |
| `LIVEKIT_API_KEY` | `APIxxxxxxxxx` | LiveKit API Key |
| `LIVEKIT_API_SECRET` | `secretxxxxxxx` | LiveKit API Secret |
| `RATE_LIMIT_SECRET` | *(Random 32-char hex string)* | Salt for privacy rate limiter |

5. Click **Deploy**. Vercel will build and launch your application at a `https://addaroom-xxxx.vercel.app` URL.

---

## 5. Usage Monitoring in AddaRoom

AddaRoom includes a built-in **Free Cloud Quota Monitor** located in the **Host Controls** modal:
- Tracks live call duration and calculates total participant-hours consumed.
- Automatically displays a non-intrusive advisory banner when a session approaches 90 minutes.
- Ensures friend groups stay well within the 100 participant-hour monthly quota at zero cost.
