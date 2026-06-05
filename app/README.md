# Yoinks App

Expo / React Native social app. Local dev runs entirely against a local mock server — no production backend is touched during development.

---

## Prerequisites

- Node 20+
- [Expo CLI](https://docs.expo.dev/more/expo-cli/) (`npm install -g expo-cli`)
- Android emulator (AVD) **or** a physical Android/iOS device
- Java 17+ (for Android builds)

> **FFmpeg note:** This project uses a custom local setup for `ffmpeg-kit-react-native` because the official native binaries were deprecated. See [docs/FFMPEG_setup.md](docs/FFMPEG_setup.md) before first-time setup.

---

## Quick start

```bash
# 1. Install dependencies
cd app
npm install

# 2. Copy env and configure for your device (see below)
cp .env.example .env

# 3. Start the mock server (separate terminal)
cd ../mock-server
npm install
npm run dev

# 4. Start the app
cd ../app
npm run local          # iOS/Android — picks up .env automatically
```

---

## Environment variables

Copy `.env.example` → `.env`. The example file has safe defaults for local dev.

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_API_BASE` | GraphQL endpoint — points to mock server |
| `EXPO_PUBLIC_API_BASE_REST` | REST base URL — points to mock server |
| `EXPO_PUBLIC_USE_ADB_REVERSE` | Android networking mode (see below) |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Leave empty for mock payments |
| `EXPO_PUBLIC_STRIPE_MERCHANT_IDENTIFIER` | Leave empty for mock payments |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Leave empty to skip Google auth locally |

`.env` is git-ignored. `.env.example` is the only committed reference. Never commit `.env`.

---

## Mock server

The mock server lives in `../mock-server` and runs on `http://localhost:4000`.

It is a **separate Node.js process** — the app does not start it. You must run it yourself before launching the app:

```bash
cd mock-server
npm run dev    # auto-restarts on changes
```

The mock server simulates:
- Auth (Apple, Google, dev-bypass)
- GraphQL queries and mutations
- Yoinks wallet, unlocking, payouts
- Mock Stripe payments (no real money)

See `mock-server/docs/MOCK_SERVER_API.md` for full endpoint reference.

---

## Android: emulator vs physical device

The app's networking behavior differs depending on how you connect:

### Android Emulator (AVD) — default

```bash
npm run local:android:emu
# or
EXPO_PUBLIC_USE_ADB_REVERSE=false npm run local
```

The emulator routes `10.0.2.2` → your machine's `localhost`. The app remaps `127.0.0.1 → 10.0.2.2` automatically when `EXPO_PUBLIC_USE_ADB_REVERSE=false`.

### Physical Android device — via adb reverse

```bash
# One command — runs adb reverse and forces EXPO_PUBLIC_USE_ADB_REVERSE=true
npm run local:android:device
```

`adb reverse` forwards device port 4000 → your machine's port 4000, so `127.0.0.1:4000` works directly on the device. The script sets `EXPO_PUBLIC_USE_ADB_REVERSE=true` inline so the app never remaps to `10.0.2.2`.

### iOS Simulator

iOS Simulator shares `localhost` with the Mac. No special setup needed — `127.0.0.1:4000` works directly.

```bash
npm run local:ios
```

---

## Stripe: mock mode vs test mode

### Mock mode (default — `MOCK_PAYMENTS=true` in mock-server `.env`)

No Stripe keys needed. The mock server returns fake payment intents (`pi_mock_...`). The app detects the prefix and calls `POST /mock-payment/complete` automatically. No real network calls are made.

Leave `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=` empty in the app `.env`.

### Stripe Test mode (`MOCK_PAYMENTS=false`)

Requires:
1. A Stripe test account — get keys from [dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys)
2. `STRIPE_SECRET_KEY=sk_test_...` and `STRIPE_WEBHOOK_SECRET=whsec_...` in `mock-server/.env`
3. `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...` in `app/.env`
4. Stripe CLI forwarding webhooks: `stripe listen --forward-to localhost:4000/stripe/webhook`

No real money moves in test mode — Stripe test cards are used.

---

## Video posting

Video capture and posting is **disabled in local dev**. The camera capture flow is present but only photo posting is fully wired. This is intentional — video processing requires the full native FFmpeg pipeline which is not configured for local simulator/emulator use.

Do not re-enable video in local dev without reading [docs/FFMPEG_setup.md](docs/FFMPEG_setup.md) first.

---

## Useful scripts

```bash
npm run typecheck          # type-check (also regenerates Expo typed routes)
npm run local              # start app — iOS/Android
npm run local:ios          # start app — iOS only
npm run local:android:emu  # start app — Android emulator (USE_ADB_REVERSE=false)
npm run local:android:device  # start app — physical Android device (runs adb reverse first)
```

---

## GraphQL codegen

The app uses [GraphQL Code Generator](https://the-guild.dev/graphql/codegen) to produce typed hooks and document nodes from `.graphql` source files.

**Current status: codegen is not runnable locally.**

- Source operations: `src/graphql/*.graphql`
- Generated output: `src/gql/graphql.ts`, `src/gql/gql.ts`, `src/gql/fragment-masking.ts`
- Config: `codegen.ts` — **missing** (not committed)
- Packages: `@graphql-codegen/cli` and plugins — **not installed** (not in devDependencies)

The generated files in `src/gql/` were produced against the production AWS AppSync schema and then manually patched for newer operations (`GetCommentsByMoment`, `CreateComment`). These files are committed as-is and treated as stable.

**Do not run `npm run codegen`** until:
1. `codegen.ts` is restored and committed
2. Codegen packages are added to devDependencies
3. The schema source (production introspection or committed `schema.graphql`) is confirmed

If you need to add a new GraphQL operation before codegen is restored, manually append the type definitions and document node to `src/gql/graphql.ts` following the same pattern as `GetCommentsByMomentDocument` (lines 575–610).

---

## Project structure

```
app/
├── src/
│   ├── app/              # Expo Router screens
│   │   ├── (app)/        # authenticated routes
│   │   └── (auth)/       # auth routes
│   ├── components/       # reusable UI components
│   ├── machines/         # XState v5 state machines
│   ├── services/         # API and business logic
│   ├── gql/              # generated GraphQL types (committed, do not edit)
│   ├── graphql/          # source .graphql operation files
│   ├── hooks/            # shared React hooks
│   ├── styles/           # Unistyles theme and tokens
│   ├── types/            # shared TypeScript types
│   └── utils/            # pure utility functions
├── .env.example          # safe to commit — copy to .env
├── .env                  # git-ignored — your local config
└── package.json
```
