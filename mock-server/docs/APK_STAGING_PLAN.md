# Yoinks — APK / Staging Build Plan

> Status: READY — `staging-apk` EAS profile added. Replace hosted mock-server URL before building.

---

## Current local dev setup

### App environment variables (`app/.env`)

| Variable | Current value | Purpose |
|---|---|---|
| `EXPO_PUBLIC_APP_ENV` | `local` | Runtime mode (`local` \| `staging` \| `production`) |
| `EXPO_PUBLIC_API_BASE` | `http://127.0.0.1:4000/graphql` | GraphQL endpoint |
| `EXPO_PUBLIC_API_BASE_REST` | `http://127.0.0.1:4000/` | REST base URL |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | Stripe Test Mode publishable key |
| `EXPO_PUBLIC_USE_ADB_REVERSE` | `true` | `true` = physical Android via adb reverse; `false` = emulator |
| `EXPO_PUBLIC_ENABLE_DEV_LOGIN` | `true` | Shows dev user-select buttons on login screen |
| `EXPO_PUBLIC_ENABLE_MOCK_PAYMENTS` | `true` | Allows `pi_mock_` payment intents without Stripe |
| `EXPO_PUBLIC_ENABLE_MOCK_PAYOUT` | `true` | Shows "Seed $5 Earnings" / "Request Payout" in wallet |
| `EXPO_PUBLIC_ENABLE_MOCK_UPLOADS` | `true` | Allows mock upload URLs from hosted server |
| `EXPO_PUBLIC_VIDEO_ENABLED` | `false` | Video capture gate — keep false until pipeline is ready |

### Mock server environment variables (`mock-server/.env`)

| Variable | Required | Description |
|---|---|---|
| `APP_ENV` | No (default `local`) | Server runtime mode |
| `PORT` | No (default `4000`) | HTTP port — Railway/Render inject this automatically |
| `PUBLIC_API_BASE_URL` | No (default `http://localhost:PORT`) | Public base URL for constructing upload/media URLs |
| `MOCK_PAYMENTS` | Yes | `true` = fake payments, no Stripe needed |
| `STRIPE_SECRET_KEY` | Only when `MOCK_PAYMENTS=false` | Stripe test secret key (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Only when `MOCK_PAYMENTS=false` | From `stripe listen` CLI (`whsec_...`) |

### Device networking

| Device type | How it reaches localhost:4000 |
|---|---|
| iOS Simulator | `127.0.0.1:4000` directly (Mac loopback is shared) |
| Android physical (Galaxy S8, Pixel, etc.) | `adb reverse tcp:4000 tcp:4000` then `127.0.0.1:4000` |
| Android Emulator (AVD) | `10.0.2.2:4000` — set `EXPO_PUBLIC_USE_ADB_REVERSE=false` |
| Staging APK (no cable) | HTTPS to hosted mock-server — no adb reverse needed |

### EAS profiles (`app/eas.json`)

| Profile | Type | Distribution | Notes |
|---|---|---|---|
| `development` | Dev client | Internal | Expo Go replacement; no APK |
| `preview` | APK (Android) / IPA (iOS) | Internal | Points to `api-staging.yoinks.com` (real staging) |
| `staging-apk` | APK (Android) | Internal | Points to hosted mock-server — **use this for MVP tester APK** |
| `production` | Store build | Store | Auto-increments version |

---

## Building a staging APK for the mock-server

### Before you build

1. **Deploy the mock-server** to Railway, Render, or Fly (see `MOCK_SERVER_HOSTING.md`).
2. **Get the public URL** — e.g., `https://yoinks-mock.onrender.com`.
3. **Update `app/eas.json`** `staging-apk.env`:
   - Replace `REPLACE_WITH_HOSTED_MOCK_SERVER_URL` with the actual URL (no trailing slash in GraphQL path).
4. **Verify the server is healthy**:
   ```bash
   cd mock-server
   BASE_URL=https://yoinks-mock.onrender.com ./scripts/smoke-test.sh
   ```

### Build command

```bash
cd app
eas build --profile staging-apk --platform android
```

### Install on device

```bash
# Download the APK from the EAS build link, then:
adb install path/to/yoinks-staging.apk
# Or share the QR code / download link from the Expo dashboard.
```

---

## Staging APK env vars (set in `eas.json` `staging-apk.env`)

| Variable | Staging value |
|---|---|
| `EXPO_PUBLIC_APP_ENV` | `staging` |
| `EXPO_PUBLIC_API_BASE` | `https://YOUR_MOCK_SERVER/graphql` |
| `EXPO_PUBLIC_API_BASE_REST` | `https://YOUR_MOCK_SERVER/` |
| `EXPO_PUBLIC_USE_ADB_REVERSE` | `false` |
| `EXPO_PUBLIC_ENABLE_DEV_LOGIN` | `true` |
| `EXPO_PUBLIC_ENABLE_MOCK_PAYMENTS` | `true` |
| `EXPO_PUBLIC_ENABLE_MOCK_PAYOUT` | `true` |
| `EXPO_PUBLIC_ENABLE_MOCK_UPLOADS` | `true` |
| `EXPO_PUBLIC_VIDEO_ENABLED` | `false` |

---

## Mock users available for staging

| ID | Name | Login button |
|---|---|---|
| `mock-user-001` | Frederico (Dev User) | "Continue as Frederico" |
| `mock-user-013` | André Cabral | "Continue as André" |

Both users:
- Have separate wallets (Frederico: 2999 Yoinks + $0.05 payout; André: 100 Yoinks)
- Have separate JWT tokens (`sub` = their userId)
- Will have moments, claps, and comments attributed to their own ID

**Known limitation:** `getUser` GraphQL query always returns the `mock-user-001` profile. The correct identity is stored in MMKV from the login response and used for display. This is acceptable for phase 8.

---

## Steps to produce a staging APK (checklist)

| # | Step | Status |
|---|---|---|
| 1 | Deploy mock-server to Railway/Render/Fly | TODO |
| 2 | Set `PUBLIC_API_BASE_URL` in server env | TODO |
| 3 | Update `staging-apk` EAS profile with actual hosted URL | TODO |
| 4 | Run smoke-test against hosted server | TODO |
| 5 | `eas build --profile staging-apk --platform android` | TODO |
| 6 | Install APK on tester device | TODO |
| 7 | Verify feed loads, both users can log in | TODO |
| 8 | Verify mock payment flow works | TODO |
| 9 | Verify payout debug flow works | TODO |

---

## adb reverse reference (local dev only)

```bash
# Forward mock-server port to physical Android device
adb reverse tcp:4000 tcp:4000
# Also forward Metro bundler if using dev client
adb reverse tcp:8081 tcp:8081

# Verify connection
curl http://127.0.0.1:4000/health
# Expected: {"ok":true,"server":"yoinks-mock","time":"..."}

# Check which device is connected
adb devices
```

---

## Known limitations

- Hosted mock-server uses **in-memory storage** — all data resets on restart.
- Upload files stored in `/tmp` — lost on server restart; set `PUBLIC_API_BASE_URL` so URLs are correct.
- Payout is mock only — no real Stripe Connect payout.
- `getUser` GraphQL returns `mock-user-001` profile regardless of logged-in user.
- No real Google/Apple auth — only dev-bypass login supported.
