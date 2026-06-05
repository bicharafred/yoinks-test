# Yoinks — Local MVP / UI Audit Build

> **Status:** UI Audit staging build. Mock backend. Not production.
> For tester APK setup, see [`docs/UI_AUDIT_APK_SETUP.md`](docs/UI_AUDIT_APK_SETUP.md).

This repo contains the Yoinks Local MVP — a React Native / Expo app connected to a Node.js mock API.
No AWS, no DynamoDB, no Apple/Google credentials needed for local development.

```
yoinks-local/
├── app/              ← React Native / Expo app
├── mock-server/      ← Node.js mock API (in-memory, no database)
├── docs/             ← Local dev guide, staging APK plan, hosting guide
├── render.yaml       ← One-click Render deploy config for mock-server
└── README.md
```

---

## First-time setup

### 1. Copy environment files

**Mock server:**
```bash
cp mock-server/.env.example mock-server/.env
```
The defaults in `.env` work out of the box (`MOCK_PAYMENTS=true`).
Only edit if you want to test with real Stripe test keys — see comments inside the file.

**App:**
```bash
cp app/.env.example app/.env
```
The defaults point to `localhost:4000` and match the mock server.
Change `EXPO_PUBLIC_USE_ADB_REVERSE` depending on your device (see below).

> Both `.env` files are git-ignored. Never commit them.

### 2. Install dependencies

```bash
cd mock-server && npm install
cd ../app && npm install
```

---

## Running locally

You need **two terminals** — one for the mock server, one for the app.

### Terminal 1 — Mock server

```bash
cd mock-server
npm run dev        # auto-restarts on file changes
# or
npm start          # single run, no watch
```

You should see:
```
✅  Yoinks mock server running!

   GraphQL   → http://localhost:4000/graphql
   REST      → http://localhost:4000/
   WebSocket → ws://localhost:4000/graphql
```

Leave this running.

### Terminal 2 — App

Choose the script that matches your device:

| Device | Command | Notes |
|--------|---------|-------|
| iOS Simulator | `npm run local:ios` | Opens the iOS Simulator automatically |
| Android Emulator (AVD) | `npm run local:android:emu` | Sets networking for AVD (`10.0.2.2`) |
| Android physical device | `npm run local:android:device` | Runs `adb reverse` then starts Metro |
| Any (choose in terminal) | `npm run local` | Press `i` for iOS, `a` for Android |

```bash
cd app
npm run local:ios
# or
npm run local:android:emu
# or
npm run local:android:device
```

---

## Android physical device — details

`npm run local:android:device` runs two steps automatically:

```bash
adb reverse tcp:4000 tcp:4000   # forwards mock server port
adb reverse tcp:8081 tcp:8081   # forwards Metro bundler port
expo start --dev-client
```

**Requirements:**
- Device plugged in via USB with USB debugging enabled.
- `adb` on your `PATH` (comes with Android Studio or the Android SDK platform-tools).
- `EXPO_PUBLIC_USE_ADB_REVERSE=true` in `app/.env` (the default).

If you unplug and re-plug the device, re-run `npm run adb:reverse` from the `mock-server/` folder (or re-run the full `local:android:device` script) to re-establish the tunnel.

---

## Logging in

When `EXPO_PUBLIC_ENABLE_DEV_LOGIN=true` (default in local `.env`), the login screen shows two bypass buttons:

| Button | User | Identity |
|--------|------|----------|
| **Continue as Frederico** | `mock-user-001` | Dev User — 2999 Yoinks, seeded content |
| **Continue as André** | `mock-user-013` | Tester — 100 Yoinks, clean account |

No Apple/Google account needed. These are mock users only.

---

## What works locally

| Feature | Status | Notes |
|---------|--------|-------|
| Login | ✅ Works | Bypassed — no Apple/Google needed |
| Feed (viewing moments) | ✅ Works | Seeded mock moments |
| Author profile | ✅ Works | Shows seeded moments |
| Applause / interactions | ✅ Works | Stored in memory |
| Notifications (list) | ✅ Works | Seeded notifications |
| Real-time notifications | ⚠️ Silent | WebSocket connects but never fires |
| Upload a moment | ⚠️ Partial | Upload flow runs; file goes to mock S3 sink |
| Wallet balance | ✅ Works | Returns mock balance |
| Unblur moment | ✅ Works | Deducts from mock balance |
| Buy Yoinks (mock) | ✅ Works | Fake PaymentIntent, no real charge |
| Payout (mock) | ✅ Works | Fake payout flow, no real bank transfer |
| Block/unblock user | ✅ Works | Stored in memory |
| Report a moment | ✅ Works | Stored in memory |
| Stripe payments (real) | ⚠️ Optional | Set `MOCK_PAYMENTS=false` + real `sk_test_` key |
| Push notifications | ❌ Not available | Needs real device + FCM/APNs |

> All data resets when you restart the mock server (everything is in memory).

---

## Mock payment dev tools

When `MOCK_PAYMENTS=true`, you can control payments from the terminal:

```bash
# Seed creator earnings (adds to redeemable/payout balance)
curl -X POST http://localhost:4000/payout/mock-earn \
  -H 'Content-Type: application/json' \
  -d '{"amountUsdCents": 250}'

# Mark the most recent pending payout as paid
curl -X POST http://localhost:4000/payout/mock-complete

# Inspect wallet state
curl http://localhost:4000/wallet

# Inspect ledger
curl http://localhost:4000/ledger

# Check Stripe/payment mode
curl http://localhost:4000/stripe/debug
```

---

## Making changes

### Changing mock data

Open `mock-server/server.js` and edit the `db` object at the top.
For example, to add more moments, add entries to `db.moments`.
Restart the server after saving (or use `npm run dev` to auto-restart).

### Adding a new mock endpoint

In `mock-server/server.js`, find `handleRequest` and add an `if` block:

```js
if (path === "/my-new-endpoint" && method === "POST") {
  const body = await readBody(req);
  return json(res, 200, { success: true });
}
```

---

## Troubleshooting

**"Network request failed" in the app**
→ The app can't reach the mock server.
→ If on a physical device, make sure `adb reverse` ran successfully (`npm run local:android:device` does this automatically).
→ If on Wi-Fi without `adb reverse`, replace `127.0.0.1` in `app/.env` with your machine's local IP (e.g. `192.168.1.5`). Find it with `ipconfig getifaddr en0` on Mac.

**"Cannot find module ws"**
→ Run `npm install` inside the `mock-server/` folder.

**App shows a blank screen or crashes on startup**
→ Make sure the mock server is running before opening the app.
→ Try clearing Metro cache: `npm run local -- --clear`.

**Android emulator: "Network request failed"**
→ Make sure you used `npm run local:android:emu` (not `local:android:device`).
→ The emulator script sets `EXPO_PUBLIC_USE_ADB_REVERSE=false` so the app uses `10.0.2.2` instead of `127.0.0.1`.

**Physical device: connection drops after re-plugging USB**
→ Re-run `npm run adb:reverse` from the `mock-server/` folder.
