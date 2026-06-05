import {
  type CreateInteractionInput,
  GetFeedMomentsDocument,
  GetFeedMomentsQuery,
  GetFeedMomentsQueryVariables,
  Moment,
} from "@/gql/graphql";
import { client } from "@/services/client";
import { devLog, devWarn } from "@/utils/devLog";
import { assign, fromPromise, setup } from "xstate";
import { enqueue } from "@/services/interactionQueue";
// List items: `getFeedMomentVisibility` in `utils/momentVisibility` (API `isBlurred` when not `isLocal`; else derived from 24h + seen + author).

function mergeUniqueMoments(existing: Moment[], incoming: Moment[]): Moment[] {
  const merged = new Map(existing.map((moment) => [moment.id, moment]));

  for (const moment of incoming) {
    merged.set(moment.id, moment);
  }

  return Array.from(merged.values());
}

type FeedContext = {
  moments: Moment[];
  nextToken: string | null;
  resultCount: number;
  authorId: string;
  error: string | null;
  /** Moment id of the 90% visible (or primary) media item; drives playback. */
  visibleMediaMomentId: string | null;
  /** Set by the screen when the feed tab/screen is focused. */
  isFeedScreenActive: boolean;
  /** Incremented for each `SCROLL_FEED_TO_TOP` so a listener can scroll the list. */
  scrollToTopNonce: number;
  /** Single mute flag for the whole feed; video UI reads this when wired (default: unmuted). */
  isMuted: boolean;
};

type FeedEvents =
  | { type: "REFRESH_FEED" }
  | { type: "LOAD_MORE" }
  | { type: "RETRY" }
  | { type: "ENQUEUE_INTERACTION"; input: CreateInteractionInput }
  | { type: "SET_MEDIA"; momentId: string | null }
  | { type: "SET_ACTIVE_CONTEXT"; isActive: boolean }
  | { type: "SCROLL_FEED_TO_TOP" }
  | { type: "TOGGLE_MUTED" };

const interactionUiEvents = {
  ENQUEUE_INTERACTION: {
    actions: "acceptInteractionForQueue" as const,
  },
  SET_MEDIA: { actions: "setVisibleMedia" as const },
  SET_ACTIVE_CONTEXT: { actions: "setFeedScreenActive" as const },
  SCROLL_FEED_TO_TOP: { actions: "bumpScrollToTopNonce" as const },
  TOGGLE_MUTED: { actions: "toggleFeedMuted" as const },
} as const;

export const feedMachine = setup({
  types: {
    context: {} as FeedContext,
    events: {} as FeedEvents,
    input: {} as {
      authorId: string;
    },
  },
  actions: {
    setVisibleMedia: assign({
      visibleMediaMomentId: ({ context, event }) => {
        if (event.type === "SET_MEDIA") {
          return event.momentId;
        }
        return context.visibleMediaMomentId;
      },
    }),
    setFeedScreenActive: assign({
      isFeedScreenActive: ({ context, event }) => {
        if (event.type === "SET_ACTIVE_CONTEXT") {
          return event.isActive;
        }
        return context.isFeedScreenActive;
      },
    }),
    bumpScrollToTopNonce: assign({
      scrollToTopNonce: ({ context }) => context.scrollToTopNonce + 1,
    }),
    toggleFeedMuted: assign({
      isMuted: ({ context }) => !context.isMuted,
    }),
    // Payload is typed for callers; actual MMKV/foreground flush queue comes in Step 26.
    acceptInteractionForQueue: ({ event }) => {
      if (event.type === "ENQUEUE_INTERACTION") {
        enqueue(event.input);
      }
    },
  },
  actors: {
    fetchFeedMoments: fromPromise(
      async ({
        input,
      }: {
        input: {
          nextToken: string | null;
          authorId: string;
          isRefresh: boolean;
        };
      }) => {
        const { nextToken, authorId, isRefresh } = input;

        const { data, error } = await client.query<
          GetFeedMomentsQuery,
          GetFeedMomentsQueryVariables
        >({
          query: GetFeedMomentsDocument,
          variables: { nextToken, authorId, limit: 20 },
          // Pull-to-refresh bypasses cache; pagination uses cache-first.
          fetchPolicy: isRefresh ? "network-only" : "cache-first",
        });

        if (error) {
          throw new Error(error.message);
        }

        if (!data?.getFeedMoments) {
          throw new Error("No data returned from getFeedMoments");
        }

        if (__DEV__) {
          devLog(
            "feed-client",
            "received moments:",
            data.getFeedMoments.items.map((m) => ({ id: m.id, isBlurred: m.isBlurred })),
          );
        }

        return data.getFeedMoments;
      },
    ),
  },
}).createMachine({
  id: "feed",
  context: ({ input }) => ({
    moments: [],
    nextToken: null,
    resultCount: 0,
    authorId: input?.authorId ?? "",
    error: null,
    visibleMediaMomentId: null,
    isFeedScreenActive: false,
    scrollToTopNonce: 0,
    isMuted: false,
  }),
  initial: "gettingMoments",
  states: {
    gettingMoments: {
      on: { ...interactionUiEvents },
      invoke: {
        src: "fetchFeedMoments",
        input: ({ context }) => ({
          nextToken: null,
          authorId: context.authorId,
          isRefresh: false,
        }),
        onDone: {
          target: "idle",
          actions: assign(({ context, event }) => ({
            moments: mergeUniqueMoments(
              context.moments,
              event.output.items as Moment[],
            ),
            nextToken: event.output.nextToken,
            resultCount: event.output.resultCount,
          })),
        },
        onError: {
          target: "error",
          actions: [
            ({ context, event }) => {
              if (__DEV__) {
                const err = event.error as Error;
                devWarn("feed", "─── fetchFeedMoments FAILED ──────────────────────────");
                devWarn("feed", "error message    :", err?.message ?? String(event.error));
                devWarn("feed", "error stack      :", err?.stack ?? "(none)");
                devWarn("feed", "authorId         :", context.authorId);
                devWarn("feed", "graphql URL (env):", process.env.EXPO_PUBLIC_API_BASE ?? "(unset)");
                devWarn("feed", "USE_ADB_REVERSE  :", process.env.EXPO_PUBLIC_USE_ADB_REVERSE ?? "(unset)");
                devWarn("feed", "─────────────────────────────────────────────────────");
              }
            },
            assign(({ event }) => ({
              error: (event.error as Error).message,
            })),
          ],
        },
      },
    },
    idle: {
      on: {
        REFRESH_FEED: { target: "refreshingMoments" },
        LOAD_MORE: {
          guard: ({ context }) => context.nextToken !== null,
          target: "loadingMoreMoments",
        },
        ...interactionUiEvents,
      },
    },
    refreshingMoments: {
      on: { ...interactionUiEvents },
      invoke: {
        src: "fetchFeedMoments",
        input: ({ context }) => ({
          nextToken: null,
          authorId: context.authorId,
          isRefresh: true,
        }),
        onDone: {
          target: "idle",
          actions: assign(({ event }) => ({
            moments: event.output.items as Moment[],
            nextToken: event.output.nextToken,
            resultCount: event.output.resultCount,
          })),
        },
        onError: {
          target: "idle",
        },
      },
    },
    loadingMoreMoments: {
      on: { ...interactionUiEvents },
      invoke: {
        src: "fetchFeedMoments",
        input: ({ context }) => ({
          nextToken: context.nextToken,
          authorId: context.authorId,
          isRefresh: false,
        }),
        onDone: {
          target: "idle",
          actions: assign(({ event }) => ({
            moments: event.output.items as Moment[],
            nextToken: event.output.nextToken,
            resultCount: event.output.resultCount,
          })),
        },
        onError: {
          target: "idle",
        },
      },
    },
    error: {
      on: {
        RETRY: "gettingMoments",
        SCROLL_FEED_TO_TOP: interactionUiEvents.SCROLL_FEED_TO_TOP,
      },
    },
  },
});
