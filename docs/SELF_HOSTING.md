# Future Migration: Remote Self-Hosted Cloud VM

This guide is for a **future migration path** if your friend group outgrows managed free tiers and you want to host on a dedicated remote Virtual Machine.

> [!WARNING]
> **Important Principle**: Your personal PC is **NEVER** used as a production server. This setup is strictly intended for remote cloud Virtual Machines (such as **Oracle Cloud Always Free 4 OCPU / 24GB ARM instance**, Hetzner, DigitalOcean, or Linode) running 24/7 in a remote datacenter.

---

## Remote Architecture Stack

On your remote VM, the full stack runs via Docker Compose:

1. **Caddy**: Automatic TLS / HTTPS reverse proxy.
2. **Next.js App**: Running inside an optimized Alpine container.
3. **LiveKit Open Source Server**: Apache 2.0 SFU handling voice, video, screen share, and realtime data channels.
4. **PostgreSQL 16**: Remote database storing room metadata and session credentials.

---

## 1. Remote VM Network & Firewall Setup

Open the following ports on your remote Cloud VM provider's security list (e.g. Oracle Cloud Security Lists, AWS Security Groups):

| Port / Protocol | Service | Description |
|-----------------|---------|-------------|
| `80 / TCP` | Caddy | HTTP (ACME challenge & HTTPS redirect) |
| `443 / TCP` | Caddy | HTTPS for Next.js web application |
| `7880 / TCP` | LiveKit | WebSocket Signal / Media API (proxied via Caddy) |
| `7881 / TCP` | LiveKit | WebRTC TCP fallback |
| `3478 / UDP` | LiveKit TURN | Embedded STUN / TURN relay |
| `50000-50050 / UDP` | LiveKit RTC | Direct WebRTC UDP media traffic |

---

## 2. Remote VM Configuration

1. SSH into your remote cloud VM:
   ```bash
   ssh ubuntu@your-remote-vm-ip
   ```

2. Clone your AddaRoom repository:
   ```bash
   git clone https://github.com/your-username/AddaRoom.git /opt/addaroom
   cd /opt/addaroom
   ```

3. Update `livekit.yaml` with your remote VM's external public IP:
   ```yaml
   rtc:
     tcp_port: 7881
     port_range_start: 50000
     port_range_end: 50050
     use_external_ip: true
   keys:
     your_strong_key: your_strong_secret
   ```

4. Launch with Docker Compose:
   ```bash
   docker compose --profile prod up -d --build
   ```

The application will be live at `https://your-domain.com`.
