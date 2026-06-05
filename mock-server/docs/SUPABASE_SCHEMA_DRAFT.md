# Yoinks — Supabase Schema Draft

> Status: DRAFT — documentation only. No Supabase integration has been implemented.
> This document maps the current in-memory mock data model to a target Postgres/Supabase schema.
> Use it as a reference when the Supabase migration begins.

---

## Design decisions

1. **`comments` handles both comments and replies** via a `parent_comment_id` nullable FK. A top-level comment has `parent_comment_id = NULL`. A reply has `parent_comment_id` set to an existing comment's `id`.
2. **`interactions` is one row per viewer+moment** with an `applause_count` column that accumulates. No separate table for individual claps.
3. **`ledger_entries` is append-only.** Wallet balances can be stored as cached values in `wallets`, but the ledger is the authoritative source of truth.
4. **`unlocks` has a unique constraint** on `(moment_id, viewer_id)` to prevent double-unlock charges.
5. **`blocked_users` uses a composite PK** `(blocker_id, blocked_id)`.
6. **`hidden_creators` uses a composite PK** `(user_id, creator_id)`.
7. **`hidden_moments` uses a composite PK** `(user_id, moment_id)`.
8. **Row-Level Security (RLS)** is noted per table but not designed in detail here.

---

## Tables

---

### `users`

Stores public profile data for all users.

| Column | Type | Notes |
|---|---|---|
| `id` | `text` | Primary key. Matches Supabase `auth.uid()` — no `USER#` prefix in DB |
| `name` | `text` | Display name |
| `handle` | `text` | Unique `@handle` |
| `email` | `text` | |
| `avatar_url` | `text` | Nullable |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

**Mock equivalent:** `db.user` (single user) + author objects embedded on moments  
**RLS:** Users can read all public profiles; can only update their own row

---

### `auth_identities`

Tracks linked OAuth providers (Apple, Google).

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `user_id` | `text` | FK → `users.id` |
| `provider` | `text` | `"apple"` or `"google"` |
| `provider_user_id` | `text` | External ID from provider |
| `created_at` | `timestamptz` | |

**Mock equivalent:** `db.user.linkedProviders`  
**Unique:** `(provider, provider_user_id)`

---

### `moments`

Content posts by authors.

| Column | Type | Notes |
|---|---|---|
| `id` | `text` | Primary key |
| `author_id` | `text` | FK → `users.id` |
| `sequence` | `integer` | Per-author sequential number |
| `type` | `text` | `"PHOTO"` or `"VIDEO"` |
| `description` | `text` | Caption. Nullable |
| `media_url` | `text` | Nullable (carousel moments use media_items instead) |
| `blurred_url` | `text` | Nullable |
| `video_thumbnail_url` | `text` | Nullable |
| `is_blurred` | `boolean` | True = requires unlock |
| `is_locked` | `boolean` | Deprecated alias for is_blurred — use is_blurred |
| `is_validated` | `boolean` | Content moderation pass |
| `has_adult_content` | `boolean` | |
| `applause_count` | `integer` | Denormalized total; recomputable from interactions |
| `comment_count` | `integer` | Denormalized count of top-level comments only |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

**Mock equivalent:** `db.moments[]`  
**Indexes:** `author_id`, `created_at DESC`  
**RLS:** Public read; author can update/delete their own; moderation can update `is_validated`

---

### `moment_media_items`

Individual media items for carousel moments.

| Column | Type | Notes |
|---|---|---|
| `id` | `text` | Primary key |
| `moment_id` | `text` | FK → `moments.id` |
| `type` | `text` | `"PHOTO"` or `"VIDEO"` |
| `position` | `integer` | Display order (0-indexed) |
| `media_url` | `text` | |
| `blurred_url` | `text` | Nullable |
| `thumbnail_url` | `text` | Nullable |
| `video_thumbnail_url` | `text` | Nullable |
| `width` | `integer` | Nullable |
| `height` | `integer` | Nullable |

**Mock equivalent:** `moment.mediaItems[]` embedded on each moment  
**Indexes:** `moment_id`, `(moment_id, position)`  
**RLS:** Public read

---

### `comments`

Top-level comments and replies in a single table.

| Column | Type | Notes |
|---|---|---|
| `id` | `text` | Primary key |
| `moment_id` | `text` | FK → `moments.id` |
| `parent_comment_id` | `text` | FK → `comments.id`. NULL = top-level comment |
| `author_id` | `text` | FK → `users.id` |
| `text` | `text` | Comment body. Max 280 chars enforced app-side |
| `created_at` | `timestamptz` | |

**Mock equivalent:** `db.comments[]` — same flat model with `parentCommentId`  
**Indexes:** `moment_id`, `parent_comment_id`, `created_at DESC`  
**Constraint:** `parent_comment_id` must belong to same `moment_id` (enforced app-side in mock; would be a trigger in Supabase)  
**RLS:** Public read; authors can delete their own comments

---

### `interactions`

One row per viewer+moment, accumulating applause.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `moment_id` | `text` | FK → `moments.id` |
| `viewer_id` | `text` | FK → `users.id` |
| `applause_count` | `integer` | Accumulated total (not per-tap) |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

**Mock equivalent:** `db.interactions[]`  
**Unique:** `(moment_id, viewer_id)` — enforces one row per viewer+moment  
**Indexes:** `moment_id`, `viewer_id`  
**RLS:** Public read (for clappers list); viewer can upsert their own row

---

### `unlocks`

Records each viewer who has paid to unlock a blurred moment.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `moment_id` | `text` | FK → `moments.id` |
| `viewer_id` | `text` | FK → `users.id` |
| `yoinks_spent` | `integer` | Always 1 in current product |
| `created_at` | `timestamptz` | |

**Mock equivalent:** `db.unlockedMoments` Set (key: `"viewerId:momentId"`)  
**Unique:** `(moment_id, viewer_id)` — prevents double-charge  
**RLS:** Viewer can read their own unlocks; insert is server-side only (via unlock service)

---

### `wallets`

Cached balance state per user. Ledger is authoritative; wallets store derived totals.

| Column | Type | Notes |
|---|---|---|
| `user_id` | `text` | Primary key, FK → `users.id` |
| `yoinks_available` | `integer` | Spendable Yoinks |
| `payout_available_usd_micros` | `bigint` | Creator earnings available for withdrawal |
| `payout_requested_usd_micros` | `bigint` | Funds currently in a pending payout |
| `payout_paid_lifetime_usd_micros` | `bigint` | Cumulative total ever paid out |
| `updated_at` | `timestamptz` | |

**Mock equivalent:** `db.wallets[userId]`  
**RLS:** Users can read their own wallet only; updates via server-side functions only

---

### `ledger_entries`

Append-only financial event log. Never updated or deleted.

| Column | Type | Notes |
|---|---|---|
| `id` | `text` | Primary key |
| `type` | `text` | See Ledger event types below |
| `user_id` | `text` | FK → `users.id`. `"platform"` for PLATFORM_FEE entries |
| `status` | `text` | `"CONFIRMED"` for all current entries |
| `amount_yoinks` | `integer` | Nullable — for Yoinks-denominated entries |
| `amount_usd_micros` | `bigint` | Nullable — for USD-denominated entries |
| `moment_id` | `text` | Nullable — context for unlock entries |
| `related_user_id` | `text` | Nullable — counterparty (viewer→creator or vice versa) |
| `payout_id` | `text` | Nullable — FK → `payouts.id` |
| `payment_intent_id` | `text` | Nullable — Stripe PI id |
| `idempotency_key` | `text` | Nullable. Unique index prevents duplicate entries |
| `source` | `text` | Nullable — e.g., `"STRIPE_TEST"`, `"MOCK_EARN"` |
| `created_at` | `timestamptz` | |

**Mock equivalent:** `db.ledger[]`  
**Ledger event types:** `YOINKS_PURCHASED`, `YOINKS_SPENT`, `CREATOR_EARNED`, `PLATFORM_FEE`, `PAYOUT_REQUESTED`, `PAYOUT_PAID`, `PAYOUT_FAILED`, `REFERRAL_REWARD`  
**Unique:** `idempotency_key` (where set)  
**RLS:** Users can read their own entries (excluding `PLATFORM_FEE`); no user writes

---

### `payouts`

Payout request records and their lifecycle status.

| Column | Type | Notes |
|---|---|---|
| `id` | `text` | Primary key |
| `user_id` | `text` | FK → `users.id` |
| `status` | `text` | `REQUESTED`, `PROCESSING`, `PAID`, `FAILED` |
| `amount_usd_cents` | `integer` | Requested amount in cents |
| `request_id` | `text` | Nullable — caller-supplied idempotency key |
| `failure_reason` | `text` | Nullable |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

**Mock equivalent:** `db.payouts[]`  
**Unique:** `request_id` (where set)  
**RLS:** Users can read their own payouts only; status updates via server-side functions only

---

### `blocked_users`

| Column | Type | Notes |
|---|---|---|
| `blocker_id` | `text` | FK → `users.id` |
| `blocked_id` | `text` | FK → `users.id` |
| `created_at` | `timestamptz` | |

**Primary key:** `(blocker_id, blocked_id)`  
**Mock equivalent:** `db.user.blockedAuthorIds[]`  
**RLS:** Users can read/write their own blocker_id rows

---

### `hidden_creators`

Creators whose content a user has hidden from their own feed. Does not affect profile visibility.

| Column | Type | Notes |
|---|---|---|
| `user_id` | `text` | FK → `users.id` |
| `creator_id` | `text` | FK → `users.id` |
| `created_at` | `timestamptz` | |

**Primary key:** `(user_id, creator_id)`  
**Mock equivalent:** `db.user.hiddenCreatorIds[]`  
**RLS:** Users can read/write their own user_id rows

---

### `hidden_moments`

Specific moments a user has hidden from their feed.

| Column | Type | Notes |
|---|---|---|
| `user_id` | `text` | FK → `users.id` |
| `moment_id` | `text` | FK → `moments.id` |
| `created_at` | `timestamptz` | |

**Primary key:** `(user_id, moment_id)`  
**Mock equivalent:** `db.user.hiddenMomentIds[]`  
**RLS:** Users can read/write their own user_id rows

---

### `reports`

User-submitted content reports.

| Column | Type | Notes |
|---|---|---|
| `id` | `text` | Primary key |
| `reporter_id` | `text` | FK → `users.id` |
| `reported_user_id` | `text` | Nullable, FK → `users.id` |
| `moment_id` | `text` | Nullable, FK → `moments.id` |
| `reason` | `text` | |
| `status` | `text` | `PENDING`, `REVIEWED`, `DISMISSED` |
| `created_at` | `timestamptz` | |

**Mock equivalent:** `db.reports[]`  
**RLS:** Reporters can create; moderation team reads all

---

### `notifications`

In-app notifications for the user.

| Column | Type | Notes |
|---|---|---|
| `id` | `text` | Primary key (`notification_id` in mock) |
| `user_id` | `text` | FK → `users.id` — recipient |
| `type` | `text` | `VIEW`, `UNBLUR_MOMENT`, `APPLAUSE`, etc. |
| `title` | `text` | |
| `message` | `text` | |
| `is_read` | `boolean` | |
| `media_url` | `text` | Nullable |
| `moment_id` | `text` | Nullable — context moment |
| `moment_sequence` | `integer` | Nullable |
| `viewer_id` | `text` | Nullable — who triggered the notification |
| `viewer_name` | `text` | Nullable |
| `viewer_avatar` | `text` | Nullable |
| `created_at` | `timestamptz` | |

**Mock equivalent:** `db.notifications[]`  
**Indexes:** `(user_id, created_at DESC)`, `is_read`  
**RLS:** Users can read/update their own notifications; server writes only

---

### `stripe_events`

Idempotency guard for Stripe webhook events. One row per processed Stripe event ID.

| Column | Type | Notes |
|---|---|---|
| `stripe_event_id` | `text` | Primary key — Stripe's event ID (e.g. `evt_...`) |
| `handled_at` | `timestamptz` | When the event was first processed |
| `payment_intent_id` | `text` | Nullable — `pi_...` extracted from event metadata |
| `user_id` | `text` | Nullable — normalized user ID the wallet was credited to |
| `event_type` | `text` | Stripe event type, e.g. `payment_intent.succeeded` |

**Mock equivalent:** `db.processedStripeEvents` Set (key: Stripe event ID)  
**Purpose:** Prevents double-crediting if Stripe delivers the same webhook more than once.  
**RLS:** No user access — server-side writes only

---

### `contacts`

Device contacts for the invite/referral flow. Mock-only; in production, contacts are not persisted server-side.

| Column | Type | Notes |
|---|---|---|
| `id` | `text` | Primary key |
| `user_id` | `text` | FK → `users.id` — the user who granted contacts access |
| `name` | `text` | |
| `phone` | `text` | |
| `invited` | `boolean` | |
| `created_at` | `timestamptz` | |

**Mock equivalent:** `db.contacts[]`  
**Production note:** In production, contacts should NOT be stored on the server. Invite flows should be handled client-side with a server endpoint that issues a referral code/link only.

---

## Migrations to consider

When implementing Supabase:

1. Run `computeCommentCount` as a Postgres function or materialized view rather than computing it in application code on every request.
2. Replace `db.processedIdempotencyKeys` with a `UNIQUE` constraint on `ledger_entries.idempotency_key`.
3. Replace `db.unlockedMoments` Set with the `unlocks` table's unique constraint.
4. Replace `db.processedStripeEvents` with a `stripe_events` table with a unique `stripe_event_id` column.
5. Use Supabase Realtime subscriptions instead of the silent WebSocket stub in `server.js`.
6. Supabase Storage replaces the `/tmp/yoinks-mock-uploads` directory used by `routes/moments.js`.
