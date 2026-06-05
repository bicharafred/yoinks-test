# Yoinks Mock Server — API Reference

> Last updated: 2026-06-04 — Phase 4 (comments/replies model, interaction upsert, moderation REST, service extraction)

**Local-development only.** No production backend is changed. No real money moves.
Fake Stripe Connect and fake payout flows are simulated end-to-end in memory only.

## Single active mock user

There is one dev user: `mock-user-001` / `dev@yoinks.local`. All wallet, ledger, payout,
and unlock state is scoped to this user. Multiple users are not supported.

## Repo hygiene

- `.gitignore` is present in `mock-server/`. It ignores `.env`, `.env.*`, `node_modules/`, `.data/`, `.DS_Store`, and `__MACOSX/`. It does **not** ignore `package-lock.json`.
- `.env.example` is present and safe to commit — it contains only placeholder values. Copy it to `.env` and fill in your real keys. Never commit `.env`.

## Handoff rules

When sharing or zipping this directory:

| Include | Exclude |
|---|---|
| `package.json` | `.env` — may contain real Stripe test keys |
| `package-lock.json` | `node_modules/` — regenerated with `npm install` |
| `.env.example` | `.data/` — local persistence only |
| All source files | `__MACOSX/` — macOS zip artifact, never needed |

---

## Starting the server

```bash
cd mock-server
npm run dev        # auto-restarts on file changes
# or
npm start          # single run
```

### Required env vars

Copy `.env.example` → `.env` and configure:

| Variable | Required | Description |
|---|---|---|
| `MOCK_PAYMENTS` | Yes | `true` = fake payments. `false` = real Stripe Test Mode |
| `STRIPE_SECRET_KEY` | Only when `MOCK_PAYMENTS=false` | Stripe test key (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Only when `MOCK_PAYMENTS=false` | From `stripe listen` CLI (`whsec_...`) |

`.env` is git-ignored and must never be committed. `.env.example` is the only committed reference.

---

## Payment modes

`PAYMENTS_MODE` is derived from env at startup:

| Value | Condition |
|---|---|
| `mock` | `MOCK_PAYMENTS=true` |
| `stripe_test` | `MOCK_PAYMENTS=false` + valid `STRIPE_SECRET_KEY` |
| `unconfigured` | Neither condition met |

### PAYMENTS_MODE=mock (default)

No Stripe keys needed. Payments are fake end-to-end. No real network calls.

1. App calls `POST /create-payment-intent` → gets `pi_mock_...` PI
2. App detects `pi_mock_` prefix → calls `POST /mock-payment/complete`
3. Server credits wallet + writes `YOINKS_PURCHASED` ledger entry
4. Idempotency: same PI id cannot credit twice

### PAYMENTS_MODE=stripe_test

Requires `sk_test_` key and `stripe listen --forward-to localhost:4000/stripe/webhook`.

1. App calls `POST /create-payment-intent` → real Stripe Test Mode PI
2. App completes PaymentSheet
3. Stripe sends `payment_intent.succeeded` webhook
4. Server credits wallet + writes `YOINKS_PURCHASED` ledger entry
5. Idempotency: same Stripe event id cannot credit twice

### Fake Stripe Connect

`GET /stripe-connected-account/:id` and `POST /create-stripe-connected-account` return mock
responses only. There is no real Stripe Connect integration. The onboarding URL is not real.

---

## Money units

Internally, the mock server uses **integer USD micros** for all payout/earnings:

| Display | Cents | Micros |
|---|---|---|
| $1.00 | 100 | 1,000,000 |
| $0.05 | 5 | 50,000 |
| $0.035 | 3.5 | 35,000 |

Conversion rules:
- `$X → micros`: `X * 1_000_000`
- `cents → micros`: `cents * 10_000`  (1 cent = 10,000 micros)
- `micros → cents`: `micros / 10_000`
- `micros → dollars`: `micros / 1_000_000`

Yoinks balances use **integer counts** (not float dollar values).

The `getWalletBalance` GraphQL response returns `transferable`/`redeemable` floats for app compatibility:
- `transferable = yoinksAvailable × 0.05`
- `redeemable = payoutAvailableUsdMicros ÷ 1,000,000`

---

## Unlock economics

Unlocking one blurred Moment costs 1 Yoink (50,000 micros = $0.05).

| Party | Amount |
|---|---|
| Viewer pays | −1 Yoink |
| Creator earns | +35,000 micros ($0.035) |
| Platform fee | 15,000 micros ($0.015) |

---

## Wallet model (internal)

```json
{
  "userId": "mock-user-001",
  "yoinksAvailable": 2999,
  "payoutAvailableUsdMicros": 50000,
  "payoutRequestedUsdMicros": 0,
  "payoutPaidLifetimeUsdMicros": 0,
  "updatedAt": "..."
}
```

### Wallet transitions

```
Purchase Yoinks    →  yoinksAvailable += N
Unlock Moment      →  viewer yoinksAvailable -= 1
                      creator payoutAvailable += 35,000 micros
                      platform fee: 15,000 micros (ledger only)
Payout request     →  payoutAvailable → payoutRequested
Payout paid        →  payoutRequested → payoutPaidLifetime
Payout failed      →  payoutRequested → payoutAvailable (rollback)
```

Payout transitions validate that `payoutRequestedUsdMicros >= amountUsdMicros` before moving funds.
If the balance is insufficient, an error is returned rather than silently clamping to zero.

### User ID normalization

The app may send `userId` as `"USER#mock-user-001"`. All REST endpoints that accept `userId`
strip the `USER#` prefix so wallet credits always go to `"mock-user-001"`.

---

## Auth endpoints

### POST /login

Authenticates the dev user regardless of provider (Apple, Google, or dev-bypass).

**Request:** `{ appleAuthRequest: {...} }` or `{ provider: "GOOGLE", token: "..." }` or `{ localDevBypass: true }`

**Response:**
```json
{
  "tokens": { "accessToken": "...", "refreshToken": "mock-refresh-token", "idToken": "..." },
  "author": { "id": "mock-user-001", "name": "Dev User", "email": "dev@yoinks.local" }
}
```

### POST /refresh-token

Returns a fresh fake JWT.

---

## Search endpoints

### GET /search/users?q=

Searches all seed authors by name or handle. Returns up to 20 results.

- `q` is matched case-insensitively against both `name` and `handle`.
- Empty or absent `q` returns all users.
- `momentsCount` reflects the current in-session moment count (not the seed value).

**Response:**
```json
{
  "users": [
    { "id": "mock-user-002", "name": "Sofia Rodriguez", "handle": "sofiar", "avatar": "...", "momentsCount": 4 }
  ]
}
```

---

## GraphQL

### POST /graphql

All GraphQL queries and mutations are dispatched here.

**Supported operations:**

| Operation | Type | Notes |
|---|---|---|
| GetFeedMoments | Query | Applies hiddenMomentIds, hiddenCreatorIds, blockedAuthorIds |
| GetAuthorMoments | Query | Returns [] if authorId is blocked |
| GetMoment | Query | Lookup by authorId + sequence |
| GetWalletBalance | Query | Returns {transferable, redeemable} floats |
| GetInteractionsByMoment | Query | Returns per-viewer applause records |
| GetNotifications | Query | |
| GetCommentsByMoment | Query | Returns all comments + replies; each item includes `parentCommentId` (null for top-level) |
| CreateInteraction | Mutation | **Upsert** — one record per viewer+moment; subsequent calls accumulate applauseCount |
| CreateMoment | Mutation | |
| UpdateUserName | Mutation | |
| UnblurMoment | Mutation | Calls unlock service — idempotent, ledger-backed |
| CreateReport | Mutation | |
| BlockAuthor | Mutation | Stores normalized ID (strips USER# prefix) |
| UnblockAuthor | Mutation | Compares normalized ID |
| HideMoment | Mutation | Hides specific moment from feed |
| SaveDeviceToken | Mutation | No-op (logs token prefix only) |
| SetNotificationAsRead | Mutation | |
| CreateUser | Mutation | Overwrites db.user fields |
| CreateComment | Mutation | Accepts optional `parentCommentId` for replies; validates parent exists |

#### CreateComment input

```json
{
  "input": {
    "momentId": "moment-001",
    "text": "Nice shot!",
    "authorId": "mock-user-001",
    "parentCommentId": "comment-001"
  }
}
```

`parentCommentId` is optional. If provided but the parent does not exist or belongs to a different moment, the comment is stored as top-level with a server warning log.

#### GetCommentsByMoment response shape (per item)

```json
{
  "id": "comment-001",
  "momentId": "moment-001",
  "parentCommentId": null,
  "text": "Great photo!",
  "createdAt": 1748000000,
  "author": { "id": "mock-user-002", "name": "Sofia Rodriguez", "avatar": "..." }
}
```

Replies have `parentCommentId` set to the parent comment's id. Both top-level comments and replies are returned in the same flat list, sorted newest-first. The client is responsible for grouping replies under their parent.

#### CreateInteraction — upsert behavior

One interaction record is maintained per viewer+moment. Repeated calls accumulate the applauseCount delta:

```
call 1: { applauseCount: 3, previousApplauseCount: 0 } → record.applauseCount = 3
call 2: { applauseCount: 5, previousApplauseCount: 3 } → record.applauseCount = 5
```

The `delta = applauseCount - previousApplauseCount` is added to the existing record. This supports multi-clap behavior without creating duplicate records.

---

## Payment endpoints

### POST /create-payment-intent

Creates a payment intent (mock or real Stripe depending on mode).

**Request:** `{ "amount": 499, "userId": "USER#mock-user-001" }`

The `userId` field is normalized: `"USER#mock-user-001"` and `"mock-user-001"` both resolve to the same wallet.

**Response:**
```json
{
  "paymentIntent": {
    "id": "pi_mock_...",
    "client_secret": "pi_mock_..._secret_mock",
    "amount": 499,
    "currency": "usd",
    "status": "requires_payment_method"
  }
}
```

### POST /mock-payment/complete

Completes a mock payment intent. Idempotent — same PI cannot credit twice.

**Request:** `{ "paymentIntentId": "pi_mock_..." }`

Omitting `paymentIntentId` falls back to the most recently created mock PI. This is a
**local-dev convenience only** — production never exposes this. Always pass the PI id
explicitly in automated tests.

**Response:** `{ "ok": true, "credited": 40, "ledgerEntry": {...} }`

### POST /stripe/webhook

Receives Stripe events forwarded by `stripe listen`. Verifies signature. The `userId` in
Stripe metadata is normalized before crediting the wallet. Double-credit is prevented by
two independent checks: the Stripe event id and the payment intent id — so even if the same
PaymentIntent arrives via a different event, the wallet is only credited once.

---

## Stripe Connect (mock)

These endpoints simulate Stripe Connect onboarding for the creator payout flow. **Neither endpoint makes real Stripe API calls.**

### GET /stripe-connected-account/:id

Returns mock Stripe Connect account status for the given account ID.

**Response:**
```json
{ "id": "acct_mock_...", "status": "enabled", "onboardingComplete": true }
```

### POST /create-stripe-connected-account

Returns a mock onboarding URL for the creator to complete Stripe Connect setup.

**Response:**
```json
{ "url": "https://mock-stripe-onboarding.example.com/...", "accountId": "acct_mock_..." }
```

---

## Payout lifecycle

Payout funds flow through three buckets in the wallet:

```
                     ┌─────────────────┐
                     │ payoutAvailable  │  ← creator earnings accumulate here
                     └────────┬────────┘
              POST /payout/request
                              │
                     ┌────────▼────────┐
                     │ payoutRequested  │  ← funds reserved, awaiting processing
                     └────────┬────────┘
           ┌──────────────────┼──────────────────┐
  mock-complete         mock-fail (rollback)
           │                  │
  ┌────────▼────────┐  ┌──────▼──────────┐
  │ payoutPaidLife- │  │  payoutAvailable │  ← rolled back on failure
  │ timeUsdMicros   │  │  (restored)      │
  └─────────────────┘  └─────────────────┘
```

Each transition validates that the source bucket has sufficient balance. If not, a clear
error is returned rather than silently clamping.

### GET /payout/history

Returns all payout records for the dev user.

**Response:** `{ "payouts": [...] }`

Each payout record:
```json
{
  "id": "payout_...",
  "userId": "mock-user-001",
  "status": "REQUESTED | PROCESSING | PAID | FAILED",
  "amountUsdCents": 500,
  "requestId": "optional-caller-idempotency-key",
  "createdAt": "...",
  "updatedAt": "..."
}
```

### GET /payout/summary

Returns current payout wallet state as micros + display strings.

**Response:**
```json
{
  "userId": "mock-user-001",
  "payoutAvailableUsdMicros": 50000,
  "payoutRequestedUsdMicros": 0,
  "payoutPaidLifetimeUsdMicros": 0,
  "payoutAvailableDisplay": "0.05",
  "payoutRequestedDisplay": "0.00",
  "payoutPaidLifetimeDisplay": "0.00"
}
```

### POST /payout/request

Requests a fake payout. Moves funds from available → requested.

**Request:**
```json
{
  "amountUsdCents": 500,
  "requestId": "optional-idempotency-key"
}
```

Omit `amountUsdCents` to request full available balance.

**Duplicate behavior:**
- With `requestId`: if the same `requestId` has been seen before, the existing payout is returned
  with `alreadyProcessed: true`. No second wallet deduction.
- Without `requestId`: if the user already has a REQUESTED or PROCESSING payout, it is returned
  with `existingPayout: true`. No second payout is created.

**Response:** `{ "ok": true, "payout": {...}, "summary": {...} }`

**Errors:**
- `INSUFFICIENT_PAYOUT_BALANCE` — not enough available
- `VALIDATION_ERROR` — bad input

### POST /payout/mock-complete

Marks a pending payout as PAID. Moves funds from requested → paid lifetime. Idempotent.

**Request:** `{ "payoutId": "payout_..." }`  *(omit to complete most recent pending)*

### POST /payout/mock-fail

Marks a pending payout as FAILED. Rolls funds back to available.

**Request:** `{ "payoutId": "payout_...", "reason": "Bank rejected" }`  *(omit payoutId to fail most recent)*

### POST /payout/mock-earn

Seeds creator earnings (for testing payout UI). Prefer `amountUsdMicros`:

```bash
# $5.00 in micros (recommended)
curl -X POST http://localhost:4000/payout/mock-earn \
  -H 'Content-Type: application/json' \
  -d '{"amountUsdMicros": 5000000}'

# Legacy cents format also accepted
curl -X POST http://localhost:4000/payout/mock-earn \
  -H 'Content-Type: application/json' \
  -d '{"amountUsdCents": 500}'
```

---

## Transactions endpoint

### GET /transactions?range=

Returns ledger entries for the dev user scoped to a time window. Excludes `PLATFORM_FEE` entries (those are internal).

**Query parameters:**

| Parameter | Values | Default |
|---|---|---|
| `range` | `last_week`, `last_month`, `last_year` | `last_week` |

**Response:** `{ "transactions": [...], "count": N }`

Each item:
```json
{
  "id": "ledger_...",
  "type": "YOINKS_PURCHASED",
  "status": "CONFIRMED",
  "amountYoinks": 40,
  "amountUsdMicros": null,
  "momentId": null,
  "payoutId": null,
  "createdAt": "2026-06-01T10:00:00.000Z"
}
```

> **Note:** This endpoint returns raw ledger entries. For a human-friendly display format (with `title`, `subtitle`, `amountLabel`), use `GET /wallet/history` instead.

---

## Referral endpoints

### GET /me/referral

Returns the dev user's referral code and link.

### GET /me/contacts

Returns the contact list for invite flow testing.

### POST /me/invite/send

Marks contacts as invited and immediately credits 1 Yoink per new invite (mock shortcut).

**Request:** `{ "contactIds": ["c-3", "c-5"] }`

---

## Moderation endpoints

### GET /me/hidden-creators

Returns all creators currently hidden from the dev user's feed.

**Response:** `{ "hiddenCreators": [{ "id": "mock-user-002", "name": "Sofia Rodriguez", "handle": "sofiar", "avatar": "..." }] }`

### POST /me/hidden-creators

Hides a creator from the dev user's feed. Idempotent — adding the same creator twice has no effect.

**Request:** `{ "authorId": "mock-user-002" }`

The `authorId` is normalized (strips `USER#` prefix if present) before storage.

**Response:** `{ "ok": true, "hiddenCreatorIds": ["mock-user-002"] }`

### DELETE /me/hidden-creators/:authorId

Unhides a creator. The path parameter is normalized before comparison.

**Response:** `{ "ok": true, "hiddenCreatorIds": [] }`

### GET /me/blocked-users

Returns all users currently blocked by the dev user. Blocked users are excluded from both feed and profile views.

**Response:** `{ "blockedUsers": [{ "id": "...", "name": "...", "handle": "...", "avatar": null }] }`

> **Note:** Blocking and unblocking are performed via the GraphQL `BlockAuthor` / `UnblockAuthor` mutations, not REST. This GET endpoint is read-only.

---

## Upload endpoints

These endpoints act as a local S3 substitute. The app uses presigned-URL-style paths; the mock server stores files in `/tmp/yoinks-mock-uploads/` instead of S3.

### PUT /s3-upload/:path

Stores a raw binary upload at the given path. The path segments are flattened into a single filename using `_` separators (e.g. `s3-upload/moment-001/media` → `s3-upload_moment-001_media`).

- Body: raw binary (image or video bytes)
- Response: `200 OK` (empty body) on success

### GET /s3-upload/:path

Serves a previously stored upload. Returns `Content-Type: image/jpeg` regardless of original type.

- Response: raw bytes with `200 OK`, or `404` if file not found

> **Note:** These URLs are embedded in Moment objects returned by GraphQL (e.g. `mediaUrl`, `blurredUrl`, `videoThumbnailUrl`). The app fetches them via the standard `resolveLocalUrl` utility, which remaps `127.0.0.1` to `10.0.2.2` on Android emulator.

---

## Support endpoint

### POST /support-email

Mock endpoint for the in-app "Contact Support" flow. Logs the request and immediately returns success. No email is sent.

**Response:** `{ "success": true }`

---

## Debug endpoints

### GET /health

Pre-flight used by the app's dev auth service to confirm adb reverse is working.

**Response:** `{ "ok": true, "server": "yoinks-mock", "time": "..." }`

### GET /wallet

Debug view: wallet API shape, internal wallet, payout summary, and ledger.

### GET /wallet/history

> **Note:** This endpoint is implemented in `routes/debug.js` alongside other debug endpoints,
> but returns product-facing mock data suitable for driving a transaction history UI.
> It is not internal-only.

Returns human-friendly Yoinks events derived from the ledger. Only includes
`YOINKS_PURCHASED`, `YOINKS_SPENT`, and `REFERRAL_REWARD` entries, sorted newest-first.

**Response:** `{ "history": [...], "count": N }`

Each item:
```json
{
  "id": "ledger_...",
  "type": "YOINKS_PURCHASED",
  "title": "Yoinks purchased",
  "subtitle": "Pack purchase",
  "amountLabel": "+40 Yoinks",
  "unit": "YOINKS",
  "status": "CONFIRMED",
  "createdAt": "..."
}
```

| type | title | subtitle | amountLabel |
|---|---|---|---|
| `YOINKS_PURCHASED` | Yoinks purchased | Pack purchase | `+N Yoinks` |
| `YOINKS_SPENT` | Moment unlocked | Moment ID or "Unlock" | `-1 Yoink` |
| `REFERRAL_REWARD` | Referral reward | Friend joined | `+N Yoink(s)` |

### GET /ledger

Returns the full in-memory ledger.

### GET /stripe/debug

Returns payment mode info (never logs secret key values).

**Response:**
```json
{
  "paymentsMode": "mock",
  "mockPaymentsEnabled": true,
  "hasStripeSecretKey": false,
  "hasStripeWebhookSecret": false,
  "stripeConfigured": false,
  "pendingMockPayments": []
}
```

### GET /debug/state

Full snapshot of all in-memory state: users, wallets, ledger, payouts, idempotency keys, unlocked moments, pending payments.

### POST /debug/reset

Resets all mutable state (wallet, ledger, payouts, moments, unlocks, contacts) back to seed values. Does not restart the server.

```bash
curl -X POST http://localhost:4000/debug/reset
```

---

## Ledger event types

| Type | Trigger |
|---|---|
| `YOINKS_PURCHASED` | Buying a Yoinks pack (mock or Stripe) |
| `YOINKS_SPENT` | Unlocking a blurred Moment |
| `CREATOR_EARNED` | Creator's share of an unlock |
| `PLATFORM_FEE` | Platform's share of an unlock |
| `PAYOUT_REQUESTED` | Requesting a withdrawal |
| `PAYOUT_PAID` | Withdrawal marked paid |
| `PAYOUT_FAILED` | Withdrawal failed (rolled back) |
| `REFERRAL_REWARD` | Friend accepted invite (mock shortcut) |

Each entry has: `id`, `type`, `userId`, `status`, `createdAt`, plus relevant optional fields (`amountYoinks`, `amountUsdMicros`, `momentId`, `relatedUserId`, `payoutId`, `paymentIntentId`, `idempotencyKey`, `source`).

---

## Error response format

```json
{
  "error": {
    "code": "INSUFFICIENT_YOINKS",
    "message": "You do not have enough Yoinks to unlock this Moment.",
    "details": { "required": 1, "available": 0 }
  }
}
```

Common codes:
- `INSUFFICIENT_YOINKS`
- `INSUFFICIENT_PAYOUT_BALANCE`
- `MOMENT_NOT_FOUND`
- `PAYOUT_NOT_FOUND`
- `PAYMENT_NOT_FOUND`
- `PAYMENT_NOT_CONFIGURED`
- `STRIPE_WEBHOOK_INVALID_SIGNATURE`
- `VALIDATION_ERROR`
- `NOT_FOUND`
- `INTERNAL_ERROR`

---

## Testing checklist

### Test 1 — Buy Yoinks, verify correct wallet credited

```bash
# Start server
MOCK_PAYMENTS=true npm run dev

# Check initial state
curl http://localhost:4000/wallet

# App: tap 40 Yoinks pack → tap Continue
# App calls POST /create-payment-intent with userId "USER#mock-user-001"
# App calls POST /mock-payment/complete automatically

# Verify wallet credited to mock-user-001 (not USER#mock-user-001)
curl http://localhost:4000/wallet
curl http://localhost:4000/ledger

# Try to complete same PI again → alreadyProcessed: true
curl -X POST http://localhost:4000/mock-payment/complete \
  -H 'Content-Type: application/json' \
  -d '{"paymentIntentId":"<pi_id_from_above>"}'
```

### Test 2 — Unlock a Moment

```bash
# App: find a blurred moment → tap to unlock
# Check viewer Yoinks decremented, creator earned, platform fee recorded

curl http://localhost:4000/ledger
# Look for YOINKS_SPENT, CREATOR_EARNED, PLATFORM_FEE entries

# Tap the same moment again → no second charge
```

### Test 3 — Payout flow with correct amounts

```bash
# Seed $5.00 earnings
curl -X POST http://localhost:4000/payout/mock-earn \
  -H 'Content-Type: application/json' \
  -d '{"amountUsdMicros": 5000000}'

# Verify available = 5000000 micros = $5.00
curl http://localhost:4000/payout/summary

# Request payout: 500 cents = $5.00
curl -X POST http://localhost:4000/payout/request \
  -H 'Content-Type: application/json' \
  -d '{"amountUsdCents": 500}'

# Verify: available decreased by 5000000, requested increased by 5000000
curl http://localhost:4000/payout/summary

# Complete payout
curl -X POST http://localhost:4000/payout/mock-complete

# Verify: requested cleared, paidLifetime increased
curl http://localhost:4000/payout/summary
```

### Test 4 — Duplicate payout request does not double-subtract

```bash
# Seed $10.00
curl -X POST http://localhost:4000/payout/mock-earn \
  -H 'Content-Type: application/json' \
  -d '{"amountUsdMicros": 10000000}'

# Request with idempotency key
curl -X POST http://localhost:4000/payout/request \
  -H 'Content-Type: application/json' \
  -d '{"amountUsdCents": 500, "requestId": "req-abc-123"}'

# Submit again with same requestId
curl -X POST http://localhost:4000/payout/request \
  -H 'Content-Type: application/json' \
  -d '{"amountUsdCents": 500, "requestId": "req-abc-123"}'

# Verify: summary shows available decreased only once (by 500¢ = $5.00)
curl http://localhost:4000/payout/summary
# Second response has alreadyProcessed: true
```

### Test 5 — Payout fail path

```bash
curl -X POST http://localhost:4000/payout/mock-earn -H 'Content-Type: application/json' -d '{"amountUsdMicros": 1000000}'
curl -X POST http://localhost:4000/payout/request -H 'Content-Type: application/json' -d '{"amountUsdCents": 100}'
curl -X POST http://localhost:4000/payout/mock-fail -H 'Content-Type: application/json' -d '{"reason":"Test failure"}'
curl http://localhost:4000/payout/summary  # available should be restored
```

### Test 6 — Stripe Test Mode

```bash
# Configure .env: MOCK_PAYMENTS=false, STRIPE_SECRET_KEY=sk_test_...
# stripe listen --forward-to localhost:4000/stripe/webhook
# App: complete PaymentSheet
# Webhook fires → wallet credits
# Verify idempotency: stripe trigger payment_intent.succeeded with same event id → no double credit
```

### Test 7 — Reset

```bash
curl -X POST http://localhost:4000/debug/reset
# All wallet/ledger/payout/unlock state returns to seed
```
