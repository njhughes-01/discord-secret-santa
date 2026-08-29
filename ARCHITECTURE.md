# 🎄 Discord Secret Santa - System Architecture & Documentation

## Overview

Discord Secret Santa is a secure, privacy-first, zero-exposure web application and Discord bot designed for running Secret Santa gift exchanges for Discord communities at `santa.lightmedia.club`.

---

## 🏛️ System Architecture

```
                       [ Public Internet ]
                                │
                        (Cloudflare Tunnel)
                                │
                     [ Docker Bridge: santa-net ]
                                │
    ┌───────────────────────────┴───────────────────────────┐
    │                                                       │
[ cloudflared ]                                   [ secret-santa (Node 24) ]
 (Outbound Encrypted Tunnel)                       - Express 5 API Server
                                                   - React 19 Frontend SPA
                                                   - SQLite WAL Database
```

---

## 🛡️ Security & Privacy Guarantees

1. **Zero Host Port Exposure**:
   - Host machine exposes **0 open ports** to the public internet.
   - Traffic is tunneled securely via `cloudflared` to Cloudflare's edge network.

2. **Anti-Indexing & Anti-Robot Headers**:
   - `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet`
   - `robots.txt` Disallow: `/`
   - `<meta name="robots" content="noindex, nofollow">`

3. **Rate Limiting & Anti-Brute Force**:
   - **Auth Rate Limiter**: 5 login attempts per 15 minutes per IP (`/api/admin/login`, `/api/participant/login`).
   - **Signup Rate Limiter**: 10 signups per hour per IP (`/api/signup`).
   - **General Rate Limiter**: 200 requests per 15 minutes per IP.

4. **Honeypot Bot Trap**:
   - User-facing forms contain hidden `confirm_email_field` fields with `data-lpignore="true"`. Automated scrapers filling hidden fields are rejected with HTTP 400 and logged in audit logs.

5. **Passcode Gate Wall**:
   - Unauthenticated web visitors see only an Event Passcode Gate. No signup forms or participant details are rendered until the passcode (`santa2026`) is verified.

6. **100% Ephemeral Discord Messages (`flags: 64`)**:
   - All Discord Slash Commands (`/secret-santa status`, `/secret-santa signup`) reply with `data.flags = 64` (EPHEMERAL). Responses render exclusively on the caller's private Discord client.

---

## 🗄️ Database Schema (`src/server/db.ts`)

The application auto-migrates SQLite tables on startup in WAL (Write-Ahead Logging) mode:

- **`participants`**: `id`, `discord_id`, `discord_handle`, `full_name`, `address`, `wishlist`, `created_at`
- **`matches`**: `id`, `giver_id`, `giver_handle`, `giver_name`, `receiver_id`, `receiver_handle`, `receiver_name`, `receiver_address`, `receiver_wishlist`, `created_at`
- **`tracking_info`**: `id`, `match_id`, `giver_handle`, `carrier`, `tracking_number`, `shipped_at`
- **`settings`**: `key`, `value`
- **`audit_logs`**: `id`, `timestamp`, `action`, `details`, `ip`, `severity`

---

## 🎲 Matching Algorithm (`src/server/matcher.ts`)

Uses a cryptographically-secure random Fisher-Yates derangement algorithm:
- Guarantees **no participant is assigned to themselves** (`giverId !== receiverId`).
- Ensures every participant gives exactly 1 gift and receives exactly 1 gift.

---

## 🤖 Discord Slash Commands & Webhooks

- **Webhook Endpoint**: `POST /api/discord/interactions`
- **Commands**:
  - `/secret-santa signup`: Opens an interactive Discord Modal popup for entering shipping details inside Discord.
  - `/secret-santa status`: Sends a private ephemeral message showing assigned Secret Santa recipient.
- **Announcement Webhooks**: Triggers rich markdown embeds on match generation or test requests (`POST /api/admin/test-webhook`).

---

## 📦 August 2026 Dependency Stack

- **Runtime**: Node 24 LTS (`node:24-alpine`)
- **Backend Framework**: Express `5.2.1`
- **Frontend Framework**: React `19.2.8`, Lucide React `1.37.0`
- **Database Driver**: Better-SQLite3 `13.0.3`
- **Security & Utilities**: BcryptJS `3.0.3`, UUID `14.0.2`, Express-Rate-Limit `8.7.0`
- **Bundler & CSS**: Vite `8.2.2`, Tailwind CSS `3.4.17`
