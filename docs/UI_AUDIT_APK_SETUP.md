# Yoinks — UI Audit APK Setup Guide

This guide explains how to deploy the mock-server and generate a staging Android APK for the UI Audit tester.

> **This is not a production build.** The mock-server uses in-memory storage. All data resets on restart.

---

## A. Deploy the mock-server to Render

### Prerequisites
- GitHub repo pushed to `https://github.com/bicharafred/yoinks-test`
- Render account at [render.com](https://render.com)

### Steps

1. Go to [render.com](https://render.com) → New → Web Service
2. Connect the **`yoinks-test`** GitHub repo
3. Set **Root Directory** to: `mock-server`
4. Set **Build Command**: `npm install`
5. Set **Start Command**: `npm start`
6. Add environment variables:

   | Key | Value |
   |-----|-------|
   | `APP_ENV` | `staging` |
   | `PUBLIC_API_BASE_URL` | `https://YOUR-SERVICE-NAME.onrender.com` ← replace after deploy |
   | `MOCK_PAYMENTS` | `true` |
   | `NODE_ENV` | `production` |

   > **After the first deploy**, Render assigns a URL like `https://yoinks-mock-api.onrender.com`. Update `PUBLIC_API_BASE_URL` to match.

7. Click **Create Web Service**

### Verify the server is running

```bash
curl https://yoinks-mock-api.onrender.com/health
# Expected: {"ok":true,"server":"yoinks-mock","time":"..."}
```

Or run the full smoke test from the repo:
```bash
cd mock-server
BASE_URL=https://yoinks-mock-api.onrender.com ./scripts/smoke-test.sh
```

---

## B. Update the APK API URL

Once you have the Render URL, update `app/eas.json` `staging-apk.env`:

```json
"EXPO_PUBLIC_API_BASE": "https://yoinks-mock-api.onrender.com/graphql",
"EXPO_PUBLIC_API_BASE_REST": "https://yoinks-mock-api.onrender.com/"
```

Commit and push the updated `eas.json`.

---

## C. Build the APK

```bash
cd app
eas login          # log in with your Expo account
eas build --profile staging-apk --platform android
```

EAS will:
1. Bundle the app with staging env vars (no localhost URLs)
2. Build an `.apk` file
3. Provide a download link / QR code in the Expo dashboard

Build typically takes 5–15 minutes.

---

## D. Tester instructions

### Install the APK

1. Open the build link from EAS (or share the QR code)
2. On the Android device: **Settings → Install unknown apps** → allow the browser
3. Download and install the APK
4. Open **Yoinks**

### Login

On the login screen, two buttons appear (staging mode):

| Button | User | Description |
|--------|------|-------------|
| **Continue as Frederico** | `mock-user-001` | Dev User — 2999 Yoinks, seeded feed content |
| **Continue as André** | `mock-user-013` | Tester User — 100 Yoinks, clean account |

Tap either to log in instantly (no Apple/Google account needed).

---

## E. QA Checklist

Work through each flow and note any visual/UX issues:

### Authentication
- [ ] Login screen renders correctly (logo, buttons, legal text)
- [ ] "Continue as Frederico" logs in and lands on Feed
- [ ] "Continue as André" logs in with different identity
- [ ] Back button works from login (if applicable)

### Feed
- [ ] Feed loads with seeded moments
- [ ] Moments scroll smoothly
- [ ] Blurred moments show blur overlay
- [ ] "Read More" on long caption opens Moment Detail with back button
- [ ] Pull-to-refresh works
- [ ] "Load More" / infinite scroll works

### Moment Detail
- [ ] Opens from Feed "Read More"
- [ ] Opens from profile grid tap
- [ ] Back button present and works
- [ ] Full caption visible
- [ ] Comments section reachable (scroll down or tap)
- [ ] Media plays / displays correctly

### Profile
- [ ] Own profile shows grid of moments
- [ ] Visitor profile opens from tapping another user
- [ ] Profile moments open Moment Detail (not a list)
- [ ] Avatar, name, stats display correctly

### Search / Discover
- [ ] Search bar functional
- [ ] User search returns mock users
- [ ] Moment/content search works

### Comments & Mentions
- [ ] Comments load on a moment
- [ ] @mention text highlights in orange
- [ ] Tapping a known @mention navigates to their profile
- [ ] Replying to a comment works

### Claps / Applause
- [ ] Clapping a moment increments count
- [ ] Clap count persists during session

### Create Moment
- [ ] Camera permission prompt appears
- [ ] Photo capture works
- [ ] Caption input works
- [ ] Posting adds moment to profile grid

### Report / Block / Hide
- [ ] Report flow opens and submits
- [ ] Block/hide options present in moment menu

### Feedback
- [ ] Feedback button accessible
- [ ] Feedback screen opens with back button
- [ ] Message can be typed and sent
- [ ] Success toast appears

### Wallet
- [ ] Wallet screen loads with balance
- [ ] Buy Yoinks flow opens Stripe UI (mock)
- [ ] Mock purchase completes
- [ ] Balance updates after purchase
- [ ] "Seed $5 Earnings" button visible (staging)
- [ ] "Request Payout" flow works (staging)
- [ ] Payout history shows entries

### Notifications
- [ ] Notifications screen loads seeded notifications
- [ ] Notification tap navigates to correct moment

### Transactions
- [ ] Transaction history loads
- [ ] Entries display correctly

---

## F. Known limitations

| Limitation | Detail |
|-----------|--------|
| Mock data resets | Server restarts clear all in-memory data |
| Uploads may 404 | After Render free-tier sleep, tmp uploads are cleared |
| Payout is mock | No real bank transfer; mock only |
| Stripe real payout | Future work — not implemented |
| No Supabase/Postgres | All data is in-memory |
| `getUser` GraphQL | Always returns `mock-user-001` profile (known limitation for phase 8) |
| Real-time notifications | WebSocket connects but events never fire |
| Video capture | Disabled (`EXPO_PUBLIC_VIDEO_ENABLED=false`) |
| Push notifications | Not available on staging APK |
| Google/Apple login | Not available — dev-bypass only |

---

## G. Smoke test commands

```bash
# Health check
curl https://yoinks-mock-api.onrender.com/health

# Full debug state
curl https://yoinks-mock-api.onrender.com/debug/state

# Feed query
curl -X POST https://yoinks-mock-api.onrender.com/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ getFeedMoments(limit: 3) { items { id description } } }"}'

# User search
curl "https://yoinks-mock-api.onrender.com/search/users?q=sofia"

# Login as Frederico
curl -X POST https://yoinks-mock-api.onrender.com/login \
  -H "Content-Type: application/json" \
  -d '{"localDevBypass":true,"mockUserId":"mock-user-001"}'

# Login as André
curl -X POST https://yoinks-mock-api.onrender.com/login \
  -H "Content-Type: application/json" \
  -d '{"localDevBypass":true,"mockUserId":"mock-user-013"}'

# Wallet state (mock-user-001)
curl https://yoinks-mock-api.onrender.com/wallet

# Feedback submitted
curl https://yoinks-mock-api.onrender.com/debug/feedback
```

Replace `yoinks-mock-api.onrender.com` with your actual Render URL.
