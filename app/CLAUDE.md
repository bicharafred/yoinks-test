# CLAUDE.md — Yoinks App Development Instructions

You are working on the Yoinks mobile app frontend.

This is an Expo / React Native app, not a generic web app. Before editing, inspect the existing codebase and follow the current architecture, naming conventions, design tokens, routing structure, and reusable components.

## Non-negotiable rules

- Do not create a new design system.
- Do not hardcode colors, spacing, typography, shadows, or layout values unless the existing code already does so in the same file and there is no reusable token available.
- Do not create duplicate UI components when a matching component already exists in `src/components`.
- Do not introduce new libraries without explicitly explaining why the existing stack cannot solve the problem.
- Do not run `npm install`. This is an Expo project. Use `npx expo install <dependency>` only when a dependency is truly necessary.
- Do not replace existing architecture patterns with simpler ad hoc code.
- Do not use `any` unless there is a documented unavoidable reason.
- Do not remove working business logic, analytics, permissions, auth, upload, media processing, or GraphQL behavior unless explicitly asked.
- Do not make large visual redesigns when the task asks for a flow, logic, or bug fix.
- Preserve the existing Yoinks product language: posts are `Moments`; creators are `Authors`; consumers are `Viewers`; the currency is `Yoinks`.

## Project stack

- Expo 54
- React Native 0.81
- React 19
- TypeScript
- Expo Router
- React Native Unistyles
- XState v5 for behavior/state machines
- Apollo Client v4 with AWS AppSync / GraphQL
- MMKV for local storage
- FlashList for performant lists
- Reanimated v4 for animations
- Vision Camera v4 for capture flows
- expo-image for images
- expo-video for video playback
- date-fns for dates

## Architecture map

Use the existing folder structure:

- Routes/screens: `src/app/(app)/...` and `src/app/(auth)/...`
- Reusable UI components: `src/components/...`
- Navigation components: `src/components/navigation/...`
- Moment creation UI: `src/components/moment-create/...`
- Profile UI: `src/components/profile/...`
- Wallet UI: `src/components/wallet/...`
- Settings UI: `src/components/settings/...`
- State machines / view models: `src/machines/...`
- API / business services: `src/services/...`
- GraphQL operations/types: `src/gql/...` and `src/graphql/...`
- Hooks: `src/hooks/...`
- Theme and tokens: `src/styles/index.ts` and `src/styles/unistyles.ts`
- Shared types: `src/types/...`
- Assets/icons: `src/assets/icons/...`

## Design system and styling rules

Always inspect and reuse the theme from:

- `src/styles/index.ts`
- `src/styles/unistyles.ts`

Use `react-native-unistyles` for styling.

Use theme tokens like:

- `theme.colors.foundation.background.primary`
- `theme.colors.foundation.background.secondary`
- `theme.colors.foundation.foreground.primary`
- `theme.colors.foundation.foreground.secondary`
- `theme.colors.foundation.foreground.tertiary`
- `theme.colors.foundation.foreground.brand.*`
- `theme.colors.foundation.brand.background.*`
- `theme.spacing.xsmall`
- `theme.spacing.small`
- `theme.spacing.normal`
- `theme.spacing.large`
- `theme.spacing.xlarge`

Avoid raw values such as:

- `#fff`
- `#000`
- `#FF5533`
- `16`
- `24`
- arbitrary border radii
- arbitrary opacity values

Only use raw values when the existing nearby component already uses them and there is no token available. If you must use a raw value, add a short comment explaining why.

## Component reuse protocol

Before creating a new component, search for existing components in:

- `src/components`
- `src/components/navigation`
- `src/components/moment-create`
- `src/components/profile`
- `src/components/settings`
- `src/components/wallet`
- `src/components/empty-state`

Prefer these existing components when applicable:

- `AppScreenContainer`
- `AppHeader`
- `AppHeaderBackButton`
- `AppTabBar`
- `BottomSheet`
- `EmptyState`
- `Moment`
- `MomentList`
- `MomentMedia`
- `MomentActions`
- `MomentLockedOverlay`
- `MomentMenu`
- `MomentCreateScreenContainer`
- `MomentCaptureHeader`
- `MomentCameraControls`
- `MomentViewfinderFrame`
- `MomentPermissionEducation`
- `ProfileScreen`
- `ProfileHeaderContent`
- `ProfileMomentCard`
- `SettingsSection`
- `SettingsRow`
- `WalletBalanceCard`
- `WalletPrimaryButton`
- `WalletTabs`

If a component almost fits, extend it with a typed prop instead of duplicating it.

## Expo Router rules

Use Expo Router exclusively.

- Place route files inside `src/app/...`.
- Preserve route groups such as `(app)`, `(auth)`, and `(tabs)`.
- Do not introduce legacy React Navigation route declarations.
- Use typed routes where available.
- Run the typecheck script after route changes because it generates typed Expo routes.

## State and data rules

Use the existing separation of concerns:

- Screens/components should handle rendering and user events.
- XState machines should handle complex behavior and multi-step flows.
- Apollo Client should handle GraphQL server state.
- MMKV should handle local app state, auth tokens, preferences, and offline queues.
- Services should encapsulate API/business logic that is reused across screens.

Do not put complex business logic directly inside TSX render bodies.

## Moment creation and posting flow

The creation flow is sensitive. Be careful with camera, permissions, media processing, upload queues, navigation, and background processing.

Important existing areas:

- `src/app/(app)/(tabs)/create/...`
- `src/app/(app)/create-moment/...`
- `src/app/(app)/share-moment/...`
- `src/components/moment-create/...`

If adding a caption step after photo/video capture:

- Preserve the existing capture and media permission flows.
- Preserve background media processing/upload behavior.
- Do not block the user unnecessarily after posting.
- Add the caption screen/step in the existing creation route structure.
- Reuse existing containers, headers, buttons, spacing, and theme tokens.
- Ensure both photo and video paths reach the same caption step unless product requirements say otherwise.
- Verify navigation from capture → caption/share → feed/profile works in the simulator.

## Yoinks domain rules

- A `Moment` is free for 24 hours after posting.
- If a Viewer sees the Moment within the 24-hour window, it remains visible to them permanently.
- If 24 hours pass and the Viewer has not seen it, the Moment becomes blurred.
- Unlocking a blurred Moment costs exactly 1 Yoink.
- Authors cannot set custom prices.
- Do not change this business logic unless explicitly requested.

## Visual quality rules

Before finalizing any UI task, compare the new screen with nearby existing screens.

Check:

- Same background colors
- Same text hierarchy
- Same spacing rhythm
- Same button patterns
- Same header/navigation behavior
- Same loading/skeleton/empty/error states
- Same safe-area handling
- Same dark/light theme compatibility

Do not create isolated UI that looks like it belongs to another app.

## Error, loading, and empty states

Every new screen or data-driven component must consider:

- Loading state
- Error state
- Empty state
- Permission-denied state when relevant
- Offline/local fallback when relevant

Use existing skeleton, empty-state, and error-boundary patterns where possible.

## Icons and assets

Use existing assets from `src/assets/icons` before adding new icons.

Do not import random icon packs for a single icon if an equivalent icon already exists.

## TypeScript rules

- Prefer explicit types and interfaces for props.
- Avoid `any`.
- Use existing generated GraphQL types when available.
- Keep props small and focused.
- Avoid deeply nested anonymous object types inside components when a named type would be clearer.

## Commands to run before claiming completion

After code changes, run:

```bash
npm run typecheck
```

When relevant, also run the app with:

```bash
npx expo start --dev-client
```

If route files changed, typecheck is mandatory because the project generates Expo typed routes.

## Working style

For every task:

1. First inspect the existing files related to the task.
2. Identify reusable components/tokens before writing code.
3. Explain the intended implementation plan briefly.
4. Make the smallest safe change that satisfies the request.
5. Run typecheck or explain why it could not be run.
6. Summarize changed files and what to test manually in the simulator.

## When unsure

If requirements are ambiguous, do not invent a new architecture. Make a minimal assumption, state it clearly, and keep the implementation aligned with the existing codebase.

Prefer consistency over novelty.
