# 🎄 Discord Secret Santa Application

A self-setup, zero-exposure Secret Santa web application & Discord bot built with **Node 24 LTS**, **Express 5**, **React 19**, **Better-SQLite3**, and **Tailwind CSS**.

---

## 🔒 Security & Architecture Highlights

- **Zero Host Port Exposure**: Runs with 0 open host ports using **Cloudflare Tunnel (`cloudflared`)**. No Caddy or Nginx reverse proxies required!
- **Anti-Robot Shielding**: Includes `X-Robots-Tag: noindex, nofollow`, `robots.txt` Disallow: `/`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`.
- **Passcode Access Gate**: Web interface requires an Event Passcode (`santa2026`) before rendering signup forms or participant data.
- **Discord Bot Slash Commands & Modals**: Native `/secret-santa signup` and `/secret-santa status` interactions with 100% ephemeral privacy (`flags: 64`).
- **Cryptographic Matcher**: Fisher-Yates derangement algorithm guaranteeing no participant is assigned to themselves.

---

## 🚀 Quick Deployment Guide (Docker + Cloudflare Tunnel)

### Step 1: Create a Cloudflare Tunnel
1. Log into your [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/).
2. Navigate to **Networks** → **Tunnels** → **Create a Tunnel**.
3. Name your tunnel (e.g. `secret-santa`) and select Docker environment.
4. Copy your `CLOUDFLARE_TUNNEL_TOKEN`.
5. Under **Public Hostnames**, add:
   - **Subdomain**: `santa`
   - **Domain**: `lightmedia.club`
   - **Service**: `HTTP` → `secret-santa:3000`

### Step 2: Configure Environment
Copy `.env.example` to `.env` and paste your tunnel token:
```bash
cp .env.example .env
```

### Step 3: Launch with Docker Compose
```bash
docker compose up -d
```

Your app will be live at `https://santa.lightmedia.club` with 0 exposed host ports!

---

## 🧪 Testing & Verification

Run unit, integration, and E2E verification test suite:
```bash
npm test
```

Build production bundle:
```bash
npm run build
```
