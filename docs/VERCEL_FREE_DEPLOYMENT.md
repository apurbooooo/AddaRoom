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
| **Vercel Hobby** | Free personal-use plan with usage limits | Non-commercial use only; quotas can change |
| **Supabase Free** | 500 MB database, 5 GB egress, up to 2 active projects | Projects may pause after a week of low activity |
| **LiveKit Cloud Build** | 5,000 WebRTC participant-minutes and 50 GB downstream transfer / month | Hard caps shared across free projects; new connections fail when quota is reached |

These quotas were checked against provider documentation on November 6, 2026. Review the official [Vercel Hobby](https://vercel.com/docs/plans/hobby), [Supabase pricing and pausing](https://supabase.com/pricing), and [LiveKit Cloud quotas](https://docs.livekit.io/deploy/admin/quotas-and-limits/) pages before relying on a free deployment.

---

## Step-by-Step Setup

### 1. Database Setup (Supabase / Neon)
1. Create a free project at [supabase.com](https://supabase.com).
2. Go to **Project Settings > Database > Connection String**.
3. In Supabase **Connect**, choose the shared pooler URI for serverless use and set it as `DATABASE_URL`. The app uses one Postgres.js connection per warm Vercel instance and disables prepared statements for transaction pooler compatibility. Run `pnpm db:migrate` from a trusted local environment using the database connection string before the first deployment. Supabase documents a Postgres.js pipelining caveat with transaction pooling; this optional provider path needs a real join and concurrent-join smoke test before production use.

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
   DATABASE_URL=<paste the transaction-pooler URI from Supabase Connect; require SSL>
   LIVEKIT_URL=https://yourproject.livekit.cloud
   NEXT_PUBLIC_LIVEKIT_URL=wss://yourproject.livekit.cloud
   LIVEKIT_API_KEY=your_api_key
   LIVEKIT_API_SECRET=your_api_secret
   RATE_LIMIT_SECRET=<a unique long random secret>
   ```
4. Deploy!

If you put another proxy in front of Vercel, Vercel overwrites the standard forwarded IP header unless the Enterprise Trusted Proxy feature is enabled. The app's rate limit then sees Vercel's observed address; do not claim per-user IP throttling through an unsupported proxy chain. See [Vercel request headers](https://vercel.com/docs/headers/request-headers).

