# Yoinks — Local Development Guide

How to run the app locally on iOS Simulator, Android physical device, and Android Emulator.

---

## Prerequisites

- Node.js 20+
- Expo CLI: `npm install -g @expo/cli`
- EAS CLI: `npm install -g eas-cli`
- Android Studio (for emulator) or a physical Android device

---

## 1. Start the mock-server

```bash
cd mock-server
npm install
npm start
# Server runs at http://localhost:4000
```

Verify it is healthy:
```bash
curl http://localhost:4000/health
# {"ok":true,"server":"yoinks-mock","time":"..."}
```

---

## 2. Configure `app/.env`

Copy the example and adjust:
```bash
cd app
cp .env.example .env
```

### iOS Simulator

```env
EXPO_PUBLIC_APP_ENV=local
EXPO_PUBLIC_API_BASE=http://127.0.0.1:4000/graphql
EXPO_PUBLIC_API_BASE_REST=http://127.0.0.1:4000/
EXPO_PUBLIC_USE_ADB_REVERSE=false
EXPO_PUBLIC_ENABLE_DEV_LOGIN=true
EXPO_PUBLIC_ENABLE_MOCK_PAYMENTS=true
EXPO_PUBLIC_ENABLE_MOCK_PAYOUT=true
EXPO_PUBLIC_ENABLE_MOCK_UPLOADS=true
EXPO_PUBLIC_VIDEO_ENABLED=false
```

iOS Simulator shares the Mac's loopback — `127.0.0.1` reaches the mock-server directly.

### Android physical device (recommended: adb reverse)

```bash
# Plug in the device via USB, then:
adb reverse tcp:4000 tcp:4000
adb reverse tcp:8081 tcp:8081
```

```env
EXPO_PUBLIC_USE_ADB_REVERSE=true
# All other vars same as iOS
```

`adb reverse` forwards the device's `127.0.0.1:4000` to the host machine's port 4000.

### Android Emulator (AVD)

```env
EXPO_PUBLIC_USE_ADB_REVERSE=false
# 127.0.0.1 → 10.0.2.2 remapping is automatic
```

The app's `resolveLocalUrl()` automatically remaps `127.0.0.1` to `10.0.2.2` when `USE_ADB_REVERSE=false` on Android.

---

## 3. Start the app

```bash
cd app
npx expo start --dev-client
```

Then press `i` for iOS Simulator or `a` for Android Emulator. For physical device, scan the QR code.

---

## 4. Log in

When `EXPO_PUBLIC_ENABLE_DEV_LOGIN=true`, the login screen shows two dev buttons:

- **Continue as Frederico** — logs in as `mock-user-001` (2999 Yoinks, seeded content)
- **Continue as André** — logs in as `mock-user-013` (100 Yoinks, fresh account)

Both users have separate wallets and their content is attributed correctly.

---

## 5. Debug endpoints

| Endpoint | Purpose |
|---|---|
| `GET /health` | Health check |
| `GET /wallet` | Full wallet state for `mock-user-001` |
| `GET /wallet/history` | Transaction history |
| `GET /ledger` | Full ledger |
| `GET /debug/state` | Complete in-memory state snapshot |
| `GET /debug/feedback` | Submitted feedback entries |
| `POST /debug/reset` | Reset all data to seed state |
| `POST /mock-payment/complete` | Confirm a pending mock payment |

---

## 6. Typecheck

After code changes:
```bash
cd app
npm run typecheck
```

---

## Troubleshooting

**`ECONNREFUSED` on Android physical:**
- Verify `adb reverse tcp:4000 tcp:4000` is active: `adb devices` should show your device.
- Confirm `EXPO_PUBLIC_USE_ADB_REVERSE=true` in `.env`.
- Restart the mock-server if it was stopped.

**Feed shows empty or error:**
- Open `/debug/state` in a browser to confirm moments are seeded.
- Check mock-server console for GraphQL errors.

**`__DEV__` is false in staging APK:**
- This is expected. Use `runtimeConfig.enableDevLogin` etc. for product behavior — these flags come from env vars, not `__DEV__`.
