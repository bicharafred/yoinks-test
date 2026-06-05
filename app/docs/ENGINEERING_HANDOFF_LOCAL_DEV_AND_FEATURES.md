# Yoinks Local Development & Feature Implementation Handoff

**Date:** 2026-05-31  
**Purpose:** Engineering reference document covering all changes, workarounds, and production follow-ups implemented during local development setup and feature work.

---

## 1. Executive Summary

This document covers the following areas of work:

- **iOS and Android local development setup** — running the Expo dev-client against a local mock server, Android emulator networking quirks, and environment configuration.
- **Feed / Moment card UI** — unified card structure with media + caption, blurred moment rendering, action pill layout (comments + claps side-by-side).
- **Comments and replies** — `CommentListSheet` bottom-sheet, nested reply expand/collapse, reply mode composer, clap counts per comment, optimistic `commentCount` bumping on the feed card.
- **Locked / blurred Moment unlock flow** — `MomentLockedOverlay` CTA, wallet balance guard, optimistic local unblur, `MOMENT_UNBLURRED` event to root machine.
- **Invite / Referral MVP** — `ProfileInviteSection`, `InviteSheet`, `InviteContactsSheet`, referral service, clipboard fallback, mock Yoinks reward.
- **Mock server improvements** — provider-agnostic identity linking, 12 realistic authors, 20 seeded Moments, 23 comments + 6 replies, 12 contacts, wallet, notifications.
- **Android-specific workarounds** — `10.0.2.2` URL remapping, FFmpeg exclusion bypass for photos, graceful video failure, `google-services.json` / `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` gap.
- **Known remaining issues** — Google Sign-In `DEVELOPER_ERROR`, missing Firebase credentials, reply persistence, production unlock enforcement.

---

## 2. Project Architecture Overview

### Stack

| Layer | Technology |
|---|---|
| Framework | Expo 54 + React Native 0.81 |
| Language | TypeScript 5.9 |
| Routing | Expo Router v6 (file-based) |
| Styling | react-native-unistyles v3 |
| State machines | XState v5 + `@xstate/react` v6 |
| API (server) | Apollo Client v4 + AWS AppSync / GraphQL |
| Local storage | react-native-mmkv v4 |
| Lists | `@shopify/flash-list` 2.0 |
| Animations | Reanimated v4 |
| Camera | Vision Camera v4 |
| Images | expo-image v3 |
| Video | expo-video v3 |
| Media processing | ffmpeg-kit-react-native v6 (partial — see §10) |
| Dates | date-fns v4 |

### Folder structure

```
app/
├── src/
│   ├── app/                          # Expo Router pages
│   │   ├── (app)/
│   │   │   ├── (tabs)/               # Bottom-tab screens
│   │   │   │   ├── feed.tsx          # Main feed
│   │   │   │   ├── profile.tsx       # Own profile
│   │   │   │   ├── wallet.tsx        # Wallet / Yoinks
│   │   │   │   ├── notifications.tsx
│   │   │   │   └── create/           # Capture flow
│   │   │   ├── create-moment/        # Post-capture step
│   │   │   ├── share-moment/         # Share / finalize
│   │   │   ├── single-moment.tsx
│   │   │   ├── settings.tsx
│   │   │   └── ...
│   │   └── (auth)/
│   │       └── login.tsx             # Apple / Google / Dev login
│   ├── components/                   # Reusable UI components
│   │   ├── moment.tsx                # Feed card (media + caption + actions)
│   │   ├── moment-media.tsx          # Photo / video renderer
│   │   ├── moment-actions.tsx        # Clap + comment action pills
│   │   ├── moment-locked-overlay.tsx # Unlock CTA
│   │   ├── comment-list-sheet.tsx    # Comments bottom sheet
│   │   ├── invite-sheet.tsx          # Invite method chooser
│   │   ├── invite-contacts-sheet.tsx # Contacts picker
│   │   ├── bottom-sheet.tsx          # Shared bottom-sheet primitive
│   │   ├── profile/
│   │   │   └── profile-invite-section.tsx
│   │   └── ...
│   ├── machines/                     # XState v5 machines
│   │   ├── rootMachine.ts
│   │   ├── feedMachine.ts
│   │   ├── walletMachine.ts
│   │   └── ...
│   ├── services/                     # API + business logic
│   │   ├── authService.ts            # Apple / Google Sign-In
│   │   ├── authService.local.ts      # DEV bypass (local only)
│   │   ├── momentRestApi.ts          # REST create-moment + S3 URLs
│   │   ├── momentUploadProcessor.ts  # Upload pipeline
│   │   ├── momentMediaProcessor.ts   # FFmpeg processing
│   │   ├── referralService.ts        # Invite / referral REST calls
│   │   └── ...
│   ├── hooks/
│   │   ├── useComments.ts
│   │   ├── useMomentActions.ts
│   │   └── useWalletTransferableYoinks.ts
│   ├── styles/
│   │   ├── index.ts                  # Color palette + theme objects
│   │   └── unistyles.ts              # Unistyles configuration
│   ├── gql/                          # Generated GraphQL types + operations
│   └── utils/
│       └── momentVisibility.ts       # 24h blur rule + UNBLUR_PRICE_YOINKS
├── docs/                             # Engineering docs (this file)
├── android/                          # Native Android project
├── ios/                              # Native iOS project
└── mock-server/
    └── server.js                     # Local development mock backend
```

### Environment variables (`.env`)

```bash
EXPO_PUBLIC_API_BASE=http://127.0.0.1:4000/graphql   # GraphQL endpoint
EXPO_PUBLIC_API_BASE_REST=http://127.0.0.1:4000/      # REST endpoint
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=                   # leave empty for local dev
EXPO_PUBLIC_STRIPE_MERCHANT_IDENTIFIER=               # leave empty for local dev
# EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=                   # REQUIRED for real Google Sign-In (currently unset)
```

> **IMPORTANT:** `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is not set. Google Sign-In on Android will fail with `DEVELOPER_ERROR` until it is set. See §11.

### Metro bundler

- `__DEV__` is a Metro compile-time constant — any code inside `if (__DEV__) { ... }` blocks is **dead-code-eliminated from production bundles**.
- `EXPO_PUBLIC_*` vars are baked into the bundle at build time. Changes require a Metro restart.

---

## 3. Design System / Styling System

### Token source files

| File | Purpose |
|---|---|
| `src/styles/index.ts` | Color palette, `darkTheme`, `lightTheme`, spacing scale |
| `src/styles/unistyles.ts` | Registers themes with Unistyles, enables `adaptiveThemes: true` |

### How to use tokens in components

```typescript
import { StyleSheet, useUnistyles } from "react-native-unistyles";

// StyleSheet.create receives a theme callback — use tokens here:
const styles = StyleSheet.create((theme) => ({
  container: {
    backgroundColor: theme.colors.foundation.background.primary,
    padding: theme.spacing.normal,
    borderRadius: theme.spacing.xlarge,
  },
}));

// For runtime-dynamic color (e.g. icon fill based on state):
const { theme } = useUnistyles();
<Icon color={theme.colors.foundation.foreground.primary} />
```

### Spacing scale

| Token | Value |
|---|---|
| `theme.spacing.xxsmall` | 4 |
| `theme.spacing.xsmall` | 8 |
| `theme.spacing.small` | 12 |
| `theme.spacing.normal` | 16 |
| `theme.spacing.large` | 20 |
| `theme.spacing.xlarge` | 24 |
| `theme.spacing.xxlarge` | 28 |
| `theme.spacing.xxxlarge` | 32 |

### Key color tokens

| Token | Dark | Light | Use |
|---|---|---|---|
| `foundation.background.primary` | `#000000` | `#ffffff` | Screen / card background |
| `foundation.background.secondary` | `#16181A` | `#f0f1f2` | Elevated surface / caption section |
| `foundation.foreground.primary` | `#ffffff` | `#000000` | Primary text |
| `foundation.foreground.secondary` | `#AAAEB2` | `#33383E` | Body text |
| `foundation.foreground.tertiary` | `#737980` | `#737980` | Muted / metadata text |
| `foundation.foreground.brand.tertiary` | `#FF5533` | `#FF5533` | Brand accent (coral/orange) |
| `foundation.background.alpha30` | `rgba(255,255,255,0.3)` | `rgba(0,0,0,0.3)` | Semi-transparent pill backgrounds |

### Light / dark theme behavior

`adaptiveThemes: true` in Unistyles automatically switches between `lightTheme` and `darkTheme` based on the OS system appearance. No manual toggle is needed.

### Action pill icon colors

Action pills (`MomentActions`) use a theme-aware color function:

```typescript
const getActionIconColor = (isActive: boolean) =>
  isActive ? theme.colors.common.black : theme.colors.common.white;
```

- **Inactive** (default): white icon on semi-transparent dark pill
- **Active** (viewer has clapped): black icon on white pill

### Rules for new UI

- **Never hardcode** `#fff`, `#000`, `16`, `24`, or arbitrary border radii.
- **Pill shape** (e.g. action pills, buttons): use `borderRadius: 120` or `borderRadius: 8000` with a comment — there is no pill-specific token.
- **Avatar circles**: `borderRadius: size / 2` with a comment explaining the math.
- **Card radius**: `borderRadius: theme.spacing.xlarge` (24).
- **Font sizes**: no token exists — use raw values with a `// raw` comment.

---

## 4. Feed / Moment Card Changes

### Files

- `src/components/moment.tsx` — unified card container
- `src/components/moment-media.tsx` — photo/video renderer
- `src/components/moment-actions.tsx` — clap + comment pills
- `src/components/moment-locked-overlay.tsx` — unlock CTA

### Card structure

The `Moment` component wraps media + caption in a single `<View style={styles.card}>` with `borderRadius: theme.spacing.xlarge` and `overflow: "hidden"`. This means:

- `MomentMedia` fills the card entirely — it does **not** own any border radius.
- The `captionSection` sits below the media inside the same clipped container.
- `overflow: "hidden"` clips both top (media) and bottom (caption) to the card radius automatically.

**Do not** add `borderRadius` directly to `MomentMedia`. Doing so creates a double-radius gap between media and caption.

### Caption rendering

```typescript
{!!moment.description && !isBlurred && (
  <View style={styles.captionSection}>
    <Text style={styles.captionText}>{moment.description}</Text>
  </View>
)}
```

- Caption is hidden when the moment is blurred (the viewer has not unlocked it).
- `captionSection` uses `theme.colors.foundation.background.secondary` to match the elevated card surface.

### Media-only Moments

When `moment.description` is `null` or `undefined`, the caption section is omitted entirely. The card renders as a media-only rounded rectangle.

### Blurred / locked Moments

- `getFeedMomentVisibility()` in `src/utils/momentVisibility.ts` determines `displayIsBlurred`.
- Server-backed moments: trust the API `isBlurred` field.
- Local / pending moments: derive from `createdAt + 24h` rule.
- When blurred: `MomentLockedOverlay` is rendered over the media, and `MomentActions` shows read-only counts with `isLocked={true}`.

### Comment + clap action placement

Both actions are in a horizontal `actionRow` at the bottom-right of the media:

```
[ comment-count 💬 ]  [ clap-count 👏 ]
```

This was changed from clap-only to side-by-side to add the comment icon without breaking the existing pill layout. The `isLocked` prop disables both interactions while preserving visible counts.

---

## 5. Comments Feature

### Files

- `src/components/comment-list-sheet.tsx` — full thread UI
- `src/hooks/useComments.ts` — fetch, submit, reply, cache update
- `src/components/moment-actions.tsx` — comment pill entry point
- `src/components/moment.tsx` — `isCommentSheetVisible` state + `onCommentSubmitted` callback
- `mock-server/server.js` — `db.comments`, `db.replies`, `commentsByMoment`, `createComment`

### Fetch flow

1. `CommentListSheet` mounts → `useEffect` calls `fetchComments(null)` when `visible` becomes `true`.
2. `useComments.fetchComments` runs `GetCommentsByMoment` Apollo query with `fetchPolicy: "network-only"`.
3. Results are stored in local `comments` state (not in Apollo cache, since comments are paginated per-sheet lifecycle).
4. Pagination: `nextToken` from the response; `handleLoadMore` fetches the next page on scroll.

### Submit a comment

1. User types in the `TextInput` and taps send.
2. `submitComment(text, currentAuthor)` runs `CreateComment` GraphQL mutation.
3. On success: prepends the new comment to local state, calls `bumpCommentCount(momentId)` to update the Apollo cache field, calls `onCommentSubmitted()` to increment the feed card's optimistic counter.

### Reply behavior

Replies do **not** use a dedicated GraphQL mutation. `CreateCommentInput` has no `parentCommentId` in the generated schema. Instead:

- `submitReply` is client-side only: creates a local `Reply` object with a generated ID, appends it to `localReplies` state in `CommentListSheet`.
- Still calls `bumpCommentCount` and `onCommentSubmitted` so the feed card counter reflects the reply.
- Seed replies are hardcoded in `SEED_MOCK_REPLIES` (mirrors `db.replies` in `server.js`).

**Production note:** when a `parentCommentId` field is added to the schema, `submitReply` should be updated to use a real mutation.

### Comment count rule

> `commentCount` = top-level comments + replies. Both increment the counter.

This is set explicitly in `db.moments` seed data and enforced by `bumpCommentCount`.

### Reply UI (Instagram-style)

- Tap **Reply** under a comment → reply mode (banner shows "Replying to {name}", input pre-fills `@name`).
- Tap **Cancel** (×) → exits reply mode.
- **View replies (N)** / **Hide replies** toggle — expand/collapse managed by `expandedReplyIds: Set<string>`.
- After submitting a reply, its parent comment auto-expands.

### Clap counts on comments

Comment and reply clap counts are local-only state (`useState(0)` per item). They do not persist beyond the current sheet session and are not sent to the server. This is intentional for the MVP.

---

## 6. Locked / Blurred Moments and Unlock Flow

### Files

- `src/components/moment-locked-overlay.tsx` — visual CTA
- `src/components/moment.tsx` — `handleUnblurPress`, `isLocallyUnblurred`, `MOMENT_UNBLURRED` event
- `src/hooks/useMomentActions.ts` — `unblurMoment`, `isUnblurring`
- `src/utils/momentVisibility.ts` — `getFeedMomentVisibility`, `UNBLUR_PRICE_YOINKS = 1`
- `mock-server/server.js` — `unblurMoment` resolver, wallet deduction

### Overlay states

- `isLocked = true`: shows a locked padlock icon only (the Moment is not yet available for purchase).
- `isLocked = false` (but `isBlurred = true`): shows "See with 🪙 1 Yoink" button.

### Unlock sequence

```
User taps "See with 1 Yoink"
  → guard: transferableYoinks >= UNBLUR_PRICE_YOINKS (1)
  → if not enough: Alert "Not enough Yoinks"
  → unblurMoment() in useMomentActions (GraphQL mutation)
  → on success: setIsLocallyUnblurred(true)  ← immediate UI update
  → rootActor.send({ type: "MOMENT_UNBLURRED" }) ← triggers wallet balance refresh
```

`isLocallyUnblurred` overrides `serverIsBlurred` so the card re-renders without blur immediately, before the feed machine's next Apollo snapshot.

### Wallet deduction (mock)

In `mock-server/server.js`:

```javascript
// 1 Yoink costs 0.05 transferable units
const LEGACY_TRANSFERABLE_PER_YOINK = 0.05;
db.wallet.transferable -= LEGACY_TRANSFERABLE_PER_YOINK;
```

### Production considerations

- The server must validate the viewer's balance before processing an unlock. Client-side balance checks are a UX convenience only.
- Wallet deduction and `isBlurred` flag change must be atomic (single transaction).
- Client-side `isLocallyUnblurred` is a temporary optimistic flag — it does not persist. On feed reload, the server's `isBlurred: false` on the unlocked Moment takes over.
- Locked content (`isLocked: true`) must remain inaccessible via the media URL even if the client-side blur is removed by a malicious actor. CDN signed URL or server-side access control is required.

---

## 7. Invite / Referral MVP

### Files

- `src/components/profile/profile-invite-section.tsx` — balance pill + Invite Friends button
- `src/components/invite-sheet.tsx` — chooser (Copy Link / Invite From Contacts)
- `src/components/invite-contacts-sheet.tsx` — contacts list with checkboxes
- `src/services/referralService.ts` — REST calls + DEV fallback data
- `mock-server/server.js` — `/me/referral`, `/me/contacts`, `/me/invite/send`

### Flow

```
ProfileInviteSection
  → [Invite Friends] button
  → InviteSheet (bottom sheet)
      → [Copy Invite Link]
          → fetchReferral() → Clipboard.setStringAsync(link)
          → onCopied() → success Toast
      → [Invite From Contacts]
          → Alert: "Access Contacts" (fake permission prompt)
          → InviteContactsSheet
              → fetchContacts() → list with checkboxes
              → [Send N Invites]
                  → sendInvites(contactIds)
                  → walletMachineRef.send("REFRESH_BALANCE")
                  → success Toast
```

### Mock MVP behavior (LOCAL DEV ONLY)

When `POST /me/invite/send` is called, the mock server **immediately** credits `+1 Yoink per newly invited contact`:

```javascript
// MOCK ONLY — production must NOT do this
db.wallet.transferable += newlyInvited * 0.05;
```

This shortcut exists only to allow wallet update + success toast testing in the simulator.

### Production referral lifecycle

```
sent → opened → signed_up → active → rewarded
```

- Yoinks are earned **only** when the invited user reaches `active` status (signed up + completed onboarding).
- The same referral cannot be rewarded twice (duplicate guard required on backend).
- The `invited: true` flag on a contact should be set when an invite is sent, but Yoinks should not be credited at that point.

### Android clipboard behavior

`expo-clipboard` may throw in some Android emulator environments. The `handleCopyLink` function in `InviteSheet` silently swallows the error in `__DEV__` builds and logs the referral link to the console instead:

```typescript
try {
  await Clipboard.setStringAsync(info.referralLink);
} catch (clipboardError) {
  if (!__DEV__) throw clipboardError;
  console.warn("[invite] Clipboard.setStringAsync failed:", clipboardError);
}
```

This fallback is **local dev only**. In production, clipboard failure re-throws and shows an Alert.

### DEV fallback contacts

`referralService.ts` has a hardcoded `DEV_FALLBACK_CONTACTS` array (8 contacts) used when the mock server is unreachable. This keeps the UI functional if the mock server hasn't been started yet.

---

## 8. Mock Server Changes

### Overview

`mock-server/server.js` is a single-file Node.js HTTP + WebSocket server that fakes the entire Yoinks backend for local development.

- **REST API:** `http://localhost:4000/`
- **GraphQL:** `http://localhost:4000/graphql`
- **WebSocket:** `ws://localhost:4000/graphql` (notifications stub, silent)
- **Port:** `4000`

### Running the server

```bash
node mock-server/server.js
```

### Stopping the server (EADDRINUSE fix)

```bash
# Find the process using port 4000
lsof -i :4000

# Kill it
lsof -ti :4000 | xargs kill -9
```

### In-memory database

The server uses an in-memory `db` object. **All data resets on restart.** There is no persistence layer.

### Identity model

A Yoinks account is identified by a stable `userId` (e.g. `"mock-user-001"`). Apple and Google are login providers linked to that userId.

`db.user.linkedProviders` is a mock-internal array that is **never sent to the app**. `publicUser()` strips it before every response:

```javascript
function publicUser() {
  const { linkedProviders, ...rest } = db.user;
  return rest;
}
```

### POST /login behavior

```javascript
if (body.localDevBypass)       → provider = "dev-bypass (Android [DEV] button)"
if (body.appleAuthRequest)     → provider = "apple (iOS)"
if (body.provider === "GOOGLE")→ provider = "google (Android)"
```

All three paths return the same dev user via `publicUser()`. This mirrors production behavior where Apple + Google sign-ins with the same email resolve to one Yoinks account.

### Seed data summary

| Category | Count |
|---|---|
| Authors | 12 (Dev User + 11 others) |
| Moments total | 20 |
| Blurred moments | 6 |
| Video moments | 3 (real public mp4 URLs) |
| Moments with captions | 12 |
| Top-level comments | 23 |
| Replies | 6 |
| Contacts | 12 (4 pre-marked invited) |
| Notifications | 3 (VIEW, UNBLUR_MOMENT, APPLAUSE) |
| `momentCounter` | 21 (new posts get IDs after seeded data) |

### Wallet seed

```javascript
wallet: { transferable: 149.95, redeemable: 0.05, balance: 150.00 }
// 1 Yoink = 0.05 transferable units
```

### Key REST endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/login` | Auth (Apple, Google, dev bypass) |
| `POST` | `/create-moment` | Register Moment, get S3 presigned URLs |
| `PUT` | `/s3-upload/:id/media` | Fake S3 upload receiver |
| `PUT` | `/s3-upload/:id/blurred` | Fake S3 upload receiver |
| `PUT` | `/s3-upload/:id/thumbnail` | Fake S3 upload receiver |
| `GET` | `/me/referral` | Referral code + link |
| `GET` | `/me/contacts` | Contact list |
| `POST` | `/me/invite/send` | Send invites (mock: immediate reward) |
| `POST` | `/create-payment-intent` | Stripe mock |

### iOS vs Android URL access

| Platform | Mock server address |
|---|---|
| iOS Simulator | `http://localhost:4000/` or `http://127.0.0.1:4000/` |
| Android Emulator | `http://10.0.2.2:4000/` (see §9 and §10) |

The mock server listens on `0.0.0.0` (all interfaces) and returns presigned S3 URLs using `localhost`. These URLs are remapped by the app on Android (see §10).

---

## 9. Local Development Setup

### Prerequisites

- Node.js (LTS)
- JDK 17 (Android — see §10)
- Android SDK via Android Studio, with `ANDROID_HOME` set
- Xcode + Command Line Tools (iOS)
- CocoaPods

### Install dependencies

```bash
cd app
npm install
# patch-package runs automatically via postinstall
```

### Start the mock server

```bash
# From the repo root (or wherever mock-server lives)
node mock-server/server.js

# Expected output:
# [mock] Server running on http://localhost:4000
# [mock] GraphQL: http://localhost:4000/graphql
# [mock] WebSocket: ws://localhost:4000/graphql
# [mock] Authors: 12 | Moments: 20 | ...
```

### Start Metro (clear cache recommended)

```bash
cd app
npx expo start -c
```

### Run on iOS Simulator

```bash
cd app
npx expo run:ios
# or with staging env:
npm run ios:stg
```

### Run on Android Emulator

```bash
# Start AVD from Android Studio first, then:
cd app
npx expo run:android
# or with staging env:
npm run android:stg
```

### Environment file

`.env` in the `app/` directory. Only `EXPO_PUBLIC_*` vars are exposed to the bundle.

```bash
EXPO_PUBLIC_API_BASE=http://127.0.0.1:4000/graphql
EXPO_PUBLIC_API_BASE_REST=http://127.0.0.1:4000/
```

> Android translates `127.0.0.1` → `10.0.2.2` at runtime — do not change `.env` for Android. The URL remapping is in code (see §10).

### adb reverse (alternative to 10.0.2.2)

If `10.0.2.2` does not work in a specific emulator, you can instead forward the port:

```bash
adb reverse tcp:4000 tcp:4000
```

This maps the emulator's `localhost:4000` to the host machine's port 4000. Not needed for standard AVDs where `10.0.2.2` works.

### Typecheck

Always run after any code or route changes:

```bash
cd app
npm run typecheck
# Generates Expo typed routes + runs tsc --noEmit
```

---

## 10. Android-Specific Setup and Workarounds

### Java / JDK

Android builds require **JDK 17**. Using JDK 21 or higher may cause Gradle compatibility issues.

```bash
java -version  # should show openjdk 17.x.x
```

### ANDROID_HOME and local.properties

```bash
# Required in shell profile:
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
```

`android/local.properties` must contain:

```properties
sdk.dir=/Users/<your-username>/Library/Android/sdk
```

### Android Emulator localhost issue

Inside the Android emulator, `127.0.0.1` and `localhost` resolve to the **emulator's own loopback**, not the host machine. To reach the host machine (where the mock server runs), use:

```
http://10.0.2.2:4000/
```

**Where this is handled in code:**

| File | Remapping |
|---|---|
| `src/services/authService.local.ts` | `getMockServerBase()` replaces `127.0.0.1` → `10.0.2.2` |
| `src/services/momentRestApi.ts` | `remapLocalhost()` applied to `API_BASE` and all S3 presigned URLs returned by `/create-moment` |
| `src/services/referralService.ts` | `restBase()` replaces `127.0.0.1` and `localhost` → `10.0.2.2` |

All remapping is guarded by `if (!__DEV__ || Platform.OS !== "android") return url` — **zero effect on iOS or production builds**.

### FFmpeg situation

> **Full context:** See `docs/FFMPEG_setup.md`.

The `ffmpeg-kit-react-native` v6 library requires native binaries (`ffmpeg-kit-full-gpl.aar` for Android, a `.xcframework` for iOS). The official binaries were deleted by the upstream maintainer on 2025-04-01.

**iOS:** resolved via a community-hosted `.zip` downloaded during `pod install` using a custom `.podspec` (`ffmpeg-kit-ios-full-gpl.podspec`) and an Expo Config Plugin (`with-ffmpeg-pod.js`). FFmpeg works on iOS.

**Android:** `ffmpeg-kit-full-gpl.aar` must be obtained from the team and placed in `android-libs/`. Because this file is currently unavailable, `ffmpeg-kit-react-native` is **excluded from Android autolinking**:

```json
// package.json
"expo": {
  "autolinking": {
    "android": {
      "exclude": ["ffmpeg-kit-react-native"]
    }
  }
}
```

### Android DEV workarounds for FFmpeg absence

#### Photo upload (LOCAL DEV ONLY)

In `src/services/momentMediaProcessor.ts`, `processPhoto` short-circuits on Android dev:

```typescript
if (Platform.OS === "android" && __DEV__) {
  console.warn("[momentMediaProcessor] Photo compression skipped on Android dev...");
  return { normalPath: input, blurredPath: input, thumbnailPath: null };
}
```

The raw capture file is used for both `normalPath` and `blurredPath`. No compression or blur is applied. **This is not production behavior.**

#### Video upload (LOCAL DEV ONLY)

`processVideo` throws immediately on Android dev:

```typescript
if (Platform.OS === "android" && __DEV__) {
  throw new Error("[momentMediaProcessor] Video posting is unavailable on Android dev...");
}
```

The `momentUploadProcessor` catches this error, shows a dev Toast, and returns `"retry"`. The app does not crash.

#### Production Android (no `__DEV__` guard)

Without the AAR, `processVideo` reaches the production path, which imports `ffmpeg-kit-react-native` and will fail at runtime. **This must be resolved before shipping Android video posting.**

To restore full Android video support:
1. Obtain `ffmpeg-kit-full-gpl.aar` from the team.
2. Place it at `android-libs/ffmpeg-kit-full-gpl.aar` (follow the structure in `docs/FFMPEG_setup.md`).
3. Remove `"ffmpeg-kit-react-native"` from `expo.autolinking.android.exclude` in `package.json`.
4. Rebuild: `npx expo run:android`.

### Android Gradle clean (when builds are stale)

```bash
cd android && ./gradlew clean && cd ..
npx expo run:android
```

### Google Sign-In DEVELOPER_ERROR

See §11 for full details. The short version: `google-services.json` is missing and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is not set.

---

## 11. Authentication Notes

### iOS — Sign in with Apple

**Status: fully configured. No code changes needed.**

- Entitlement: `ios/YStg/YStg.entitlements` contains `com.apple.developer.applesignin = ["Default"]`.
- Bundle ID: `app.yoinks.YoinksApp.staging`.
- Requires a real Apple ID signed into the iOS Simulator (or a real device).
- Flow: `expo-apple-authentication` → identity token → `POST /login` with `{ appleAuthRequest: { identityToken, ... } }`.

### Android — Sign in with Google

**Status: broken. `DEVELOPER_ERROR` on every attempt.**

Root causes (all three must be fixed):

**1. `android/app/google-services.json` is missing**

This file is required by the Google Services Gradle plugin (`com.google.gms.google-services`). Without it, the Android OAuth client cannot initialize.

Action: download from [Firebase Console](https://console.firebase.google.com) → Project → Android app `app.yoinks.YoinksApp` → Download `google-services.json` → place at `android/app/google-services.json`.

**2. `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is not set**

`authService.ts` calls:

```typescript
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});
```

With `webClientId: undefined`, Google Sign-In throws `DEVELOPER_ERROR` immediately.

Action: go to Google Cloud Console → APIs & Services → Credentials → find the **Web** OAuth 2.0 client (not the Android client) → copy the Client ID → add to `.env`:

```bash
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<web-client-id>.apps.googleusercontent.com
```

**3. Debug SHA-1 may not be registered**

The debug keystore SHA-1 fingerprint is:

```
5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
```

SHA-256:
```
FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C
```

Action: in Google Cloud Console → the Android OAuth client → add the SHA-1 if not present.

### DEV bypass login (Android only)

The login screen has a `[DEV] Continue as Dev User` button gated by:

```typescript
{__DEV__ && Platform.OS === "android" && (
  <TouchableOpacity onPress={handleDevLogin}>
    <Text>[DEV] Continue as Dev User</Text>
  </TouchableOpacity>
)}
```

- This button is **dead-code-eliminated from production bundles** via Metro's `__DEV__` constant.
- It calls `authService.local.ts → loginWithNativeProviderAsync()` which sends `{ localDevBypass: true }` to the mock server.
- The mock server resolves this to `mock-user-001` (same as Apple and Google paths).
- **Do not remove this button** while Google Sign-In is broken on Android.

### Mock server identity contract

| Login provider | Mock server path |
|---|---|
| iOS Apple Sign-In | `body.appleAuthRequest` → resolves to `mock-user-001` |
| Android Google Sign-In | `body.provider === "GOOGLE"` → resolves to `mock-user-001` |
| Android DEV bypass | `body.localDevBypass` → resolves to `mock-user-001` |

Wallet, Moments, unlocks, and referrals all belong to the Yoinks `userId`, not to any provider ID.

---

## 12. Upload / Posting Flow

### Files

- `src/services/momentUploadProcessor.ts` — orchestrates the full upload pipeline
- `src/services/momentMediaProcessor.ts` — FFmpeg processing
- `src/services/momentRestApi.ts` — `createMomentAndGetUploadUrls`
- `mock-server/server.js` — `POST /create-moment`, `PUT /s3-upload/:id/*`

### Pipeline (happy path)

```
1. processMediaForUpload()         → FFmpeg: compress, blur, thumbnail
2. createMomentAndGetUploadUrls()  → POST /create-moment → get S3 presigned URLs
3. uploadToS3() × 2–3             → PUT to each presigned URL (parallel)
4. cleanupFiles()                  → delete local temp files
```

### Android issue that was fixed

**Problem:** `momentUploadProcessor` was producing `TypeError: Network request failed` on Android.

**Root cause 1:** `EXPO_PUBLIC_API_BASE_REST=http://127.0.0.1:4000/` — Android emulator cannot reach `127.0.0.1` (it's the emulator's own loopback).

**Root cause 2:** The mock server returns S3 URLs like `http://localhost:4000/s3-upload/...`. Same issue.

**Fix in `momentRestApi.ts`:**

```typescript
function remapLocalhost(url: string): string {
  if (!__DEV__ || Platform.OS !== "android") return url;
  return url.replace(
    /^(https?:\/\/)(localhost|127\.0\.0\.1)(:\d+)?/,
    (_, proto, _host, port) => `${proto}10.0.2.2${port ?? ""}`,
  );
}

// Applied at module load:
const API_BASE = remapLocalhost(process.env.EXPO_PUBLIC_API_BASE_REST ?? "");

// Applied to each response URL:
return {
  mediaUrl: remapLocalhost(response.mediaUrl),
  blurredUrl: remapLocalhost(response.blurredUrl),
  videoThumbnailUrl: response.videoThumbnailUrl
    ? remapLocalhost(response.videoThumbnailUrl)
    : null,
};
```

### DEV logging

`momentUploadProcessor.ts` logs each step in `__DEV__`:

```
[momentUploadProcessor] starting job <id>
[momentUploadProcessor] platform: android
[momentUploadProcessor] file URI: file:///...
[momentUploadProcessor] request method: POST
[momentUploadProcessor] endpoint: create-moment
[momentUploadProcessor] create-moment response: { mediaUrl, blurredUrl, videoThumbnailUrl }
[momentUploadProcessor] upload URL: http://10.0.2.2:4000/s3-upload/...
[momentUploadProcessor] request method: PUT
```

### Image posting on Android

Works end-to-end in the Android emulator using the raw capture file (no FFmpeg compression). The mock server accepts the PUT and returns 200.

### Video posting on Android

Fails gracefully with a dev Toast: "Upload failed (dev)". The job returns `"retry"` and the queue handles backoff. The app does not crash.

---

## 13. Known Temporary Workarounds

### 1. Android DEV login bypass

- **What:** `[DEV] Continue as Dev User` button in `login.tsx`
- **Where:** `src/app/(auth)/login.tsx`, `src/services/authService.local.ts`
- **Why:** Google Sign-In is broken (`google-services.json` missing, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` unset)
- **Remove when:** Google Sign-In is fully configured and tested
- **Guard:** `{__DEV__ && Platform.OS === "android" && ...}` — dead code in production

### 2. Android `10.0.2.2` URL remapping

- **What:** Replaces `127.0.0.1`/`localhost` with `10.0.2.2` in network calls
- **Where:** `momentRestApi.ts` (`remapLocalhost`), `authService.local.ts` (`getMockServerBase`), `referralService.ts` (`restBase`)
- **Why:** Android emulator networking quirk
- **Remove when:** Production backend is used (production URLs won't be `127.0.0.1`)
- **Guard:** `if (!__DEV__ || Platform.OS !== "android")` — dead code in production

### 3. Android FFmpeg photo bypass

- **What:** `processPhoto` returns raw capture file instead of compressed output
- **Where:** `src/services/momentMediaProcessor.ts` (`processPhoto`, lines 80–86)
- **Why:** `ffmpeg-kit-full-gpl.aar` is unavailable; FFmpeg no-ops on Android, leaving temp files unwritten
- **Remove when:** AAR is placed in `android-libs/` and autolinking exclusion is removed
- **Guard:** `if (Platform.OS === "android" && __DEV__)` — does not apply to production Android

### 4. Android FFmpeg video graceful failure

- **What:** `processVideo` throws immediately with a clear message on Android dev
- **Where:** `src/services/momentMediaProcessor.ts` (`processVideo`, lines 137–144)
- **Why:** Same as above — prevents a harder crash deeper in the pipeline
- **Remove when:** AAR available
- **Guard:** `if (Platform.OS === "android" && __DEV__)`

### 5. Mock clipboard fallback (Android)

- **What:** `Clipboard.setStringAsync` failures are silently swallowed in `__DEV__`
- **Where:** `src/components/invite-sheet.tsx` (`handleCopyLink`)
- **Why:** `expo-clipboard` may be unavailable in some emulator configurations
- **Remove when:** Not needed — the production `throw` path is already there, gated by `if (!__DEV__) throw`

### 6. Mock contacts DEV fallback

- **What:** If `GET /me/contacts` fails, `referralService.ts` returns 8 hardcoded contacts
- **Where:** `src/services/referralService.ts` (`DEV_FALLBACK_CONTACTS`)
- **Why:** Keeps the invite flow testable before the mock server starts
- **Remove when:** This is acceptable for dev; in production, a real failure should propagate

### 7. Immediate referral Yoinks credit (mock)

- **What:** `POST /me/invite/send` immediately credits +1 Yoink per invited contact
- **Where:** `mock-server/server.js` (lines 1186–1196)
- **Why:** Allows testing wallet update + success toast in the simulator without completing the full referral lifecycle
- **Remove when:** This is mock-server-only and cannot affect production

### 8. Seeded reply data in `comment-list-sheet.tsx`

- **What:** `SEED_MOCK_REPLIES` hardcodes reply data for `comment-006` and `comment-007`
- **Where:** `src/components/comment-list-sheet.tsx` (lines 37–74)
- **Why:** Replies are client-side only (no `parentCommentId` in the GraphQL schema); seed data mirrors `db.replies` in the mock server
- **Remove when:** A reply mutation is added to the GraphQL schema

---

## 14. Known Remaining Issues / Production Follow-Ups

### Authentication

- [ ] **Google Sign-In `DEVELOPER_ERROR`:** Place `android/app/google-services.json`, set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, register debug SHA-1 in Google Cloud Console (see §11)
- [ ] **Production Apple/Google account linking:** Backend must map `identityToken` → verified email → Yoinks `userId`. The mock simulates this; production requires a real auth service implementation
- [ ] **Token refresh:** `tokenManager.ts` handles `getValidToken` — verify refresh logic against production token TTL

### Media / Upload

- [ ] **FFmpeg for Android:** Obtain `ffmpeg-kit-full-gpl.aar` (see `docs/FFMPEG_setup.md`). Place in `android-libs/`, remove autolinking exclusion. Test video compression + blur on Android before shipping
- [ ] **Long-term FFmpeg strategy:** The upstream library is abandoned. Evaluate alternatives: `react-native-image-resizer` for photos, an internal binary hosting strategy for the FFmpeg AAR, or a custom native module
- [ ] **Production S3 upload flow:** Verify presigned URL expiration, content-type headers, and `Content-Length` behavior match production S3 bucket policy

### Comments and Replies

- [ ] **Reply persistence:** Replies are client-side only. Add `parentCommentId` to `CreateCommentInput` in the GraphQL schema and update `submitReply` to use a real mutation
- [ ] **Comment clap persistence:** Comment clap counts are local state — they reset when the sheet closes. Add a `clapComment` mutation or REST endpoint

### Unlock / Wallet

- [ ] **Server-side unlock enforcement:** The backend must validate `isBlurred` status and balance before processing `unblurMoment`. Client-side checks are UX only
- [ ] **Atomic wallet transactions:** Wallet deduction and content access grant must be a single server-side transaction to prevent partial state
- [ ] **CDN access control:** Blurred content media URLs should be protected by signed CDN tokens — removing client-side blur is not sufficient to gatekeep access

### Referral

- [ ] **Real referral lifecycle:** Implement `sent → opened → signed_up → active → rewarded` pipeline on the backend. Remove the immediate Yoinks credit from the mock once the real lifecycle is in place
- [ ] **Real contacts integration:** `expo-contacts` can request real device contacts. Currently the mock server serves fake contacts. Decide whether to use real contacts, a simulated picker, or a phone-number entry form

### Notifications

- [ ] **Real WebSocket / AppSync subscriptions:** The mock server has a silent WebSocket stub. Wire up real push notification handling when AppSync subscriptions are available
- [ ] **Notification deep-linking:** Tapping a notification should deep-link to the relevant Moment. Verify `momentId` / `momentSequence` routing.

### iOS / Android parity

- [ ] Verify invite clipboard behavior on a real iOS device (not just simulator)
- [ ] Test Apple Sign-In on a real device (simulator may not support it fully)
- [ ] Test video playback of mock mp4 URLs on both platforms

---

## 15. Testing Checklist

### Authentication

- [ ] **iOS:** Tap "Sign in with Apple" → Apple auth sheet appears → sign in succeeds → lands on feed
- [ ] **Android (DEV):** Tap "[DEV] Continue as Dev User" → skips Google auth → lands on feed as "Dev User"
- [ ] **Android (real):** Tap "Sign in with Google" → Google account picker appears → sign in succeeds (requires `google-services.json` + `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`)

### Feed

- [ ] Feed loads with mix of moments from multiple authors
- [ ] Moments with captions render caption below the media inside the card
- [ ] Moments without captions show media-only card
- [ ] Blurred moments show blurred media + "See with 1 Yoink" button
- [ ] Locked moments (padlock) show the lock icon only, no unlock CTA

### Post a Moment

- [ ] Take a photo → preview → (caption screen if implemented) → post → moment appears in feed
- [ ] **Android:** photo upload succeeds end-to-end (raw file used, no FFmpeg)
- [ ] **Android:** video upload shows a Toast and fails gracefully (not a crash)

### Comments

- [ ] Tap comment icon → `CommentListSheet` opens
- [ ] Existing comments load from mock server
- [ ] Type a comment → send → appears at top of list
- [ ] `commentCount` on feed card increments after submitting
- [ ] Tap "Reply" on a comment → banner shows "Replying to {name}" → input pre-fills `@name`
- [ ] Submit reply → reply appears under parent comment → parent comment auto-expands
- [ ] Tap "View replies (N)" → replies expand; "Hide replies" → collapse
- [ ] Tap clap icon on a comment → count increments locally
- [ ] Locked moment: comment icon is visible but tapping does not open the sheet

### Unlock / Wallet

- [ ] Open a blurred moment → "See with 🪙 1 Yoink" button visible
- [ ] Tap unlock → activity indicator while processing
- [ ] Blur clears immediately after unlock (optimistic)
- [ ] Wallet balance decrements by 1 Yoink (check wallet tab)
- [ ] Trigger unlock with 0 Yoinks → Alert "Not enough Yoinks"

### Invite / Referral

- [ ] Profile screen shows "N Yoinks" balance pill + "Invite Friends" button
- [ ] Tap "Invite Friends" → `InviteSheet` opens
- [ ] Tap "Copy Invite Link" → success Toast; link is in clipboard (iOS); on Android emulator log confirms the link
- [ ] Tap "Invite From Contacts" → permission Alert → confirm → `InviteContactsSheet` opens
- [ ] Contacts load with "Already invited" badge on pre-invited contacts
- [ ] Select 2 uninvited contacts → "Send 2 Invites" button enabled → tap → success Toast
- [ ] Wallet balance increments by 2 Yoinks (mock MVP behavior only)

---

## 16. File Change Summary

> The project is not a git repository in the local working directory. The following lists the files that were **written or materially changed** during this session.

### `mock-server/server.js`

**Purpose:** Local development backend (HTTP + GraphQL + WebSocket).

**What changed:** Complete rewrite.
- Provider-agnostic identity model: `db.user.linkedProviders` (mock-internal), `publicUser()` strips it.
- `/login` detects Apple, Google, and dev bypass, logs which provider, always returns the same user.
- 12 authors (`A.dev`, `A.sofia`, `A.marcus`, ..., `A.ethan`).
- 20 seeded Moments: 5 dev user, 3 Sofia, 3 Marcus, 3 Emma, 2 Amanda, 2 Renata, 1 Daniel, 1 Vanessa. 3 VIDEO, 6 blurred, 12 with captions.
- 23 comments, 6 replies, all `commentCount` values verified.
- 12 contacts (4 pre-invited), wallet seed `{ transferable: 149.95, redeemable: 0.05, balance: 150.00 }`, 3 notifications.
- `momentCounter: 21`.

**Production-ready?** No. This file is exclusively for local development.

---

### `src/services/momentRestApi.ts`

**Purpose:** REST client for creating Moments and getting S3 presigned URLs.

**What changed:**
- Added `remapLocalhost()` function.
- Applied to `API_BASE` (module-level constant) to fix `127.0.0.1` → `10.0.2.2` on Android.
- Applied to all three S3 URL fields returned by `createMomentAndGetUploadUrls` (mock server returns `localhost`; Android emulator needs `10.0.2.2`).
- Added `__DEV__` log in `authedFetch`.

**Production-ready?** Yes. `remapLocalhost` is fully guarded by `if (!__DEV__ || Platform.OS !== "android")` — it is a no-op on iOS and in production builds.

---

### `src/services/momentMediaProcessor.ts`

**Purpose:** FFmpeg processing pipeline (compress, blur, thumbnail).

**What changed:**
- `processPhoto`: early return for `Platform.OS === "android" && __DEV__` — uses raw capture file for both `normalPath` and `blurredPath`.
- `processVideo`: early throw for `Platform.OS === "android" && __DEV__` with a clear message about FFmpeg being excluded.

**Production-ready?** Partially. The `__DEV__` guards ensure these workarounds never run in production. However, production Android video processing still depends on obtaining `ffmpeg-kit-full-gpl.aar` (see §10).

---

### `src/services/momentUploadProcessor.ts`

**Purpose:** Orchestrates the full upload pipeline (media processing → REST → S3 → cleanup).

**What changed:**
- Added `Platform` import from `react-native`.
- Added `Toast` import from `react-native-toast-message`.
- Added comprehensive `__DEV__` log lines before each network call.
- Improved catch block: extracts the error message string, shows a dev Toast, returns `"retry"`.

**Production-ready?** Yes. All additions are inside `if (__DEV__)` blocks.

---

### `src/components/moment.tsx`

**Purpose:** Feed card component.

**What changed:** Added caption section, `isLocallyUnblurred` optimistic state, `CommentListSheet` integration, `onCommentSubmitted` callback, `optimisticCommentCount` state.

**Production-ready?** Yes.

---

### `src/components/moment-actions.tsx`

**Purpose:** Clap + comment action pills.

**What changed:** Added `commentCount` prop, `onCommentPress` prop, `isLocked` prop. Comment icon now renders alongside clap icon in a horizontal `actionRow`. `isLocked` disables interactions while preserving visible counts.

**Production-ready?** Yes.

---

### `src/components/comment-list-sheet.tsx`

**Purpose:** Comments bottom sheet.

**Status:** New file.

**What it does:** Full comment thread: fetch, submit, reply mode, expand/collapse replies, per-comment clap counts, `onCommentSubmitted` callback to increment the feed card counter.

**Production-ready?** Partially. The `submitReply` path is client-side only (no GraphQL mutation). Seed data in `SEED_MOCK_REPLIES` mirrors mock server data.

---

### `src/hooks/useComments.ts`

**Purpose:** Comment fetch, submit, and reply logic.

**Status:** New file.

**What it does:** `fetchComments` (paginated), `submitComment` (GraphQL mutation + Apollo cache bump), `submitReply` (client-side only + cache bump).

**Production-ready?** Partially. `submitReply` must be updated when a `parentCommentId` field is added to the schema.

---

### `src/components/moment-locked-overlay.tsx`

**Purpose:** Blurred Moment unlock CTA.

**What changed:** Needs verification — likely pre-existing with minor updates. Renders "See with 1 Yoink" or padlock based on `isLocked` prop.

**Production-ready?** Yes.

---

### `src/components/invite-sheet.tsx`

**Purpose:** Invite method chooser bottom sheet (Copy Link / Invite From Contacts).

**Status:** New file (or significant rewrite).

**What it does:** Fetches referral link, copies to clipboard (with Android dev fallback), shows contacts sheet.

**Production-ready?** Yes. Clipboard fallback is properly guarded by `if (!__DEV__) throw`.

---

### `src/components/invite-contacts-sheet.tsx`

**Purpose:** Contact list picker for sending invites.

**Status:** New file (or significant rewrite).

**What it does:** Loads contacts from `GET /me/contacts`, checkbox multi-select, `sendInvites()` call, duplicate-invite guard.

**Production-ready?** Yes (against a real backend). Currently uses mock contacts.

---

### `src/components/profile/profile-invite-section.tsx`

**Purpose:** Yoinks balance pill + Invite Friends button on the profile screen.

**Status:** New file (or significant rewrite).

**What it does:** Reads wallet balance via `useWalletTransferableYoinks`, opens `InviteSheet`, handles success Toasts.

**Production-ready?** Yes, with the note that the Toast copy says "simulator only" for the reward message.

---

### `src/services/referralService.ts`

**Purpose:** REST client for referral and invite endpoints.

**What changed:** Needs verification — likely pre-existing. Contains `restBase()` with `10.0.2.2` remapping, `fetchReferral`, `fetchContacts`, `sendInvites`, DEV fallback contacts.

**Production-ready?** Partially. `10.0.2.2` remapping is local-dev-only and guarded. `DEV_FALLBACK_CONTACTS` returns fake contacts when the server is unreachable in `__DEV__` only.

---

## 17. Engineering Recommendations

1. **Keep the mock server realistic.** The 12-author, 20-moment seed data significantly improves UX review during local development. Maintain it as features evolve. Add new seed data when new features are built.

2. **Isolate all local dev workarounds behind `__DEV__` guards.** Never use `if (__DEV__)` for product logic — only for logging, dev shortcuts, and workarounds. All current workarounds follow this pattern.

3. **Centralize URL remapping.** The `remapLocalhost` function exists in three places (`momentRestApi.ts`, `authService.local.ts`, `referralService.ts`). Consider extracting it to a shared utility once the codebase stabilizes. For now, duplication is acceptable because the function is small and each usage is independently guarded.

4. **Resolve FFmpeg before Android video shipping.** The `ffmpeg-kit-react-native` upstream abandonment is the highest-risk dependency in the project. Explore:
   - Internal binary hosting (the team stores `ffmpeg-kit-full-gpl.aar` and serves it via a private Maven repo).
   - A custom React Native module wrapping a lightweight FFmpeg variant.
   - An alternative library (e.g., `react-native-compressor`, server-side transcoding).

5. **Complete Google Sign-In configuration.** The three missing items (`google-services.json`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, SHA-1 registration) are external configuration, not code changes. This can be done by any engineer with Firebase/Google Cloud Console access.

6. **Add GraphQL `parentCommentId` to enable server-side replies.** The current client-side reply approach is a reasonable MVP compromise but should be replaced before launch. The mock server's `createComment` resolver already accepts `parentCommentId` when provided — the schema just needs updating.

7. **Server-side unlock is mandatory before launch.** The current client-side wallet check is only a UX convenience. The server must enforce balance checks and content access atomically.

8. **Avoid hardcoded styling.** New UI should always use `theme.spacing.*` and `theme.colors.foundation.*`. Use raw values only when no token applies, and always add a comment explaining why. Consistency across dark and light themes depends on this discipline.

9. **Run `npm run typecheck` after every code change.** This project generates Expo typed routes as part of the typecheck script. Skipping it can produce runtime routing errors that are hard to trace.

10. **Document Firebase / Google Cloud setup for the team.** The credentials gap that causes `DEVELOPER_ERROR` will block every new Android engineer. Add a one-page setup guide (similar in style to `docs/FFMPEG_setup.md`) covering Firebase Console access, `google-services.json` download, and Google Cloud Console OAuth configuration.
