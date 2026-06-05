# Yoinks — Hosting the Mock-Server

How to deploy the mock-server to Railway, Render, or Fly so a staging APK can reach it without a USB cable.

---

## Architecture overview

```
Tester's phone (staging APK)
    ↓ HTTPS
Hosted mock-server (Railway/Render/Fly)
    ↓ in-memory (no DB for phase 8)
```

The mock-server is a plain Node.js HTTP server. No database is needed for phase 8 — all data is in-memory and resets on restart.

---

## Required server environment variables

Set these in your hosting platform's environment/config:

| Variable | Example value | Purpose |
|---|---|---|
| `PORT` | *(injected by platform)* | HTTP port — do NOT hardcode; Railway/Render set this |
| `PUBLIC_API_BASE_URL` | `https://yoinks-mock.onrender.com` | Used to build upload/media URLs returned to the app |
| `APP_ENV` | `staging` | Runtime mode label |
| `MOCK_PAYMENTS` | `true` | Use fake payment intents (no Stripe keys needed) |

Optional (only if using real Stripe test mode):
| `STRIPE_SECRET_KEY` | `sk_test_...` | Stripe test secret |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Stripe webhook signing secret |

---

## Deploy to Render (recommended for simplicity)

1. Create a new **Web Service** at [render.com](https://render.com).
2. Connect your GitHub repo (or use manual deploy).
3. Set **Root directory** to `mock-server`.
4. Set **Build command**: `npm install`
5. Set **Start command**: `node server.js`
6. Add environment variables:
   ```
   APP_ENV=staging
   PUBLIC_API_BASE_URL=https://YOUR-SERVICE.onrender.com
   MOCK_PAYMENTS=true
   ```
7. Deploy. Render injects `PORT` automatically.

---

## Deploy to Railway

1. Create a new **Service** at [railway.app](https://railway.app).
2. Point to the `mock-server` directory.
3. Add environment variables (Railway injects `PORT`):
   ```
   APP_ENV=staging
   PUBLIC_API_BASE_URL=https://YOUR-APP.up.railway.app
   MOCK_PAYMENTS=true
   ```
4. Railway generates a public URL automatically.

---

## Verify after deploy

Run the smoke-test against your hosted URL:
```bash
cd mock-server
BASE_URL=https://your-mock-server.onrender.com ./scripts/smoke-test.sh
```

Or manually:
```bash
curl https://your-mock-server.onrender.com/health
# Expected: {"ok":true,"server":"yoinks-mock","time":"..."}

curl -X POST https://your-mock-server.onrender.com/login \
  -H "Content-Type: application/json" \
  -d '{"localDevBypass":true,"mockUserId":"mock-user-001"}'
# Expected: {"tokens":{...},"author":{...}}
```

---

## Update the staging APK config

After you have the hosted URL, update `app/eas.json` `staging-apk.env`:

```json
"EXPO_PUBLIC_API_BASE": "https://your-mock-server.onrender.com/graphql",
"EXPO_PUBLIC_API_BASE_REST": "https://your-mock-server.onrender.com/"
```

Then build:
```bash
cd app
eas build --profile staging-apk --platform android
```

---

## Security notes

- `/debug/reset` and `/debug/state` expose full in-memory state — acceptable for a private staging mock-server; do not expose to the public internet.
- No real user data is ever stored — everything is seeded fake data.
- Stripe keys in env are test-mode only — never use live keys.

---

## Known limitations (phase 8)

- **In-memory only** — all data resets when the server restarts (Render free tier sleeps after inactivity).
- **Upload files stored in `/tmp`** — lost on restart; uploaded photos/videos will 404 after a server restart. This is acceptable for MVP testing.
- **Single-process** — no horizontal scaling. Fine for internal APK testing with 2 users.
- **No persistent sessions** — login tokens are valid for 24h and are re-issued on each login.
