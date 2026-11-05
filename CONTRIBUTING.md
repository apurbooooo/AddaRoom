# Contributing to AddaRoom

Thank you for your interest in contributing to **AddaRoom**!

AddaRoom is committed to a **free-first and open-source strategy**. Our mission is to keep infrastructure and operational costs at zero for friend groups, developers, and self-hosters.

---

## Code of Conduct

1. Be friendly, respectful, and constructive.
2. Keep the user experience private, lightweight, and accessible.
3. Respect privacy: never introduce mandatory accounts, telemetry, user tracking, or third-party ads.

---

## Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/AddaRoom.git
   cd AddaRoom
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Start local services with Docker Compose**:
   ```bash
   docker compose up postgres livekit -d
   ```

4. **Run the Next.js development server**:
   ```bash
   pnpm dev
   ```

5. **Run test suite**:
   ```bash
   pnpm test
   ```

---

## Core Guidelines

- **No Paid Mandatory Dependencies**: Features must never require paid cloud platforms, proprietary video APIs, or credit card requirements.
- **Strict Capacity Limits**: Respect the 2, 3, 4, and 6 participant limits with atomic database enforcement.
- **Preserve Documentation & Comments**: Always maintain high quality documentation.
- **Mobile First**: Verify that all UI changes render cleanly across mobile portrait and landscape viewports.
