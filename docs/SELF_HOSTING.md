# AddaRoom Self-Hosting Guide

This guide walks you through deploying AddaRoom on your own server or VPS using Docker Compose.

---

## Prerequisites

- A Linux server (Ubuntu 22.04 / 24.04, Debian 12, or similar)
- Docker Engine & Docker Compose installed
- A public domain name (e.g. `adda.yourdomain.com`) pointing to your server's public IP address

---

## 1. Network & Firewall Configuration

WebRTC media transport uses direct UDP packets for low latency. Ensure the following ports are open in your server firewall (UFW / cloud security group):

| Port / Protocol | Service | Description |
|-----------------|---------|-------------|
| `80 / TCP` | Caddy / Web | HTTP (ACME challenge & HTTPS redirect) |
| `443 / TCP` | Caddy / Web | HTTPS for Next.js web application |
| `7880 / TCP` | LiveKit | WebSocket Signal / Media API (proxied via Caddy) |
| `7881 / TCP` | LiveKit | WebRTC TCP fallback (for restricted networks) |
| `3478 / UDP` | LiveKit TURN | Embedded STUN / TURN relay service |
| `50000-50050 / UDP` | LiveKit RTC | WebRTC UDP media streams |

> [!WARNING]
> **Cloudflare Tunnels Note**: Standard Cloudflare Tunnels (cloudflared) do **not** support arbitrary WebRTC UDP media packets without paid enterprise Spectrum plans. You must allow direct UDP traffic on ports `50000-50050` and port `3478` to your server.

---

## 2. Setup Configuration

1. Clone the repository on your server:
   ```bash
   git clone https://github.com/your-username/AddaRoom.git /opt/addaroom
   cd /opt/addaroom
   ```

2. Copy the sample environment file:
   ```bash
   cp .env.example .env
   ```

3. Update the `.env` file with your settings:
   ```env
   NODE_ENV=production
   DOMAIN_NAME=adda.yourdomain.com
   ACME_EMAIL=your-email@yourdomain.com
   NEXT_PUBLIC_LIVEKIT_URL=wss://adda.yourdomain.com/livekit
   LIVEKIT_API_KEY=your_strong_api_key
   LIVEKIT_API_SECRET=your_strong_api_secret
   ```

4. Update `livekit.yaml` with your server's external public IP:
   ```yaml
   rtc:
     tcp_port: 7881
     port_range_start: 50000
     port_range_end: 50050
     use_external_ip: true
   keys:
     your_strong_api_key: your_strong_api_secret
   ```

---

## 3. Deploying with Docker Compose

Start all services in production mode:

```bash
docker compose --profile prod up -d --build
```

This launches:
- `addaroom-db`: PostgreSQL database with health checks
- `addaroom-livekit`: LiveKit SFU Media Server
- `addaroom-app`: AddaRoom Next.js application
- `addaroom-caddy`: Automated Let's Encrypt TLS reverse proxy

---

## 4. Maintenance & Backups

### Database Backup
```bash
docker exec -t addaroom-db pg_dump -U postgres addaroom > addaroom_backup.sql
```

### Viewing Logs
```bash
docker compose logs -f app
docker compose logs -f livekit
```
