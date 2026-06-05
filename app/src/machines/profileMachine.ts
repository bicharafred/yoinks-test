import {
  type GetAuthorMomentsQuery,
  GetAuthorMomentsDocument,
  type GetAuthorMomentsQueryVariables,
} from "@/gql/graphql";
import { client } from "@/services/client";
import type { ActorRefFrom } from "xstate";
import { assign, fromPromise, setup } from "xstate";

const AUTHOR_MOMENTS_PAGE_LIMIT = 40;

/**
 * One row from `GetAuthorMoments` (GraphQL). Used as the profile grid / author moments list item type.
 */
export type ProfileMomentItem = NonNullable<
  NonNullable<GetAuthorMomentsQuery["getAuthorMoments"]>
>["items"][number];

function mergeUniqueProfileMoments(
  existing: ProfileMomentItem[],
  incoming: ProfileMomentItem[],
): ProfileMomentItem[] {
  const merged = new Map<string, ProfileMomentItem>();

  for (const moment of existing) {
    merged.set(moment.id, moment);
  }

  for (const moment of incoming) {
    merged.set(moment.id, moment);
  }

  return Array.from(merged.values());
}

export type ProfileMachineInput = {
  authorId: string;
};

export type ProfileMachineContext = {
  authorId: string;
  moments: ProfileMomentItem[];
  nextToken: string | null;
  resultCount: number;
  error: string | null;
  /** Moment id driving visible media / playback in full-screen list. */
  visibleMediaMomentId: string | null;
  /** True while the profile or user-moments route is focused. */
  isScreenActive: boolean;
  /** Shared mute flag for video UI on this surface. */
  isMuted: boolean;
  /**
   * Incremented when the UI should re-apply `initialScrollIndex` (e.g. after navigation or list edits).
   */
  scrollToIndexNonce: number;
};

export type ProfileMachineEvents =
  | { type: "REFRESH" }
  | { type: "LOAD_MORE" }
  | { type: "RETRY" }
  | { type: "SET_MEDIA"; payload: { momentId: string | null } }
  | { type: "SET_ACTIVE_CONTEXT"; payload: { active: boolean } }
  | { type: "TOGGLE_MUTED" }
  | { type: "REMOVE_MOMENT_FROM_LIST"; payload: { momentId: string } }
  /** After blocking the viewed author (e.g. from user-moments), clear local list before refetch. */
  | { type: "CLEAR_AUTHOR_MOMENTS" };

const profileUiEvents = {
  SET_MEDIA: { actions: "assignSetMedia" as const },
  SET_ACTIVE_CONTEXT: { actions: "assignActiveContext" as const },
  TOGGLE_MUTED: { actions: "toggleMuted" as const },
  REMOVE_MOMENT_FROM_LIST: { actions: "removeMomentFromList" as const },
  CLEAR_AUTHOR_MOMENTS: { actions: "clearAuthorMoments" as const },
} as const;

export const profileMachine = setup({
  types: {
    context: {} as ProfileMachineContext,
    events: {} as ProfileMachineEvents,
    input: {} as ProfileMachineInput,
  },
  guards: {
    canLoadMore: ({ context }) => context.nextToken != null,
  },
  actors: {
    fetchAuthorMoments: fromPromise(
      async ({
        input,
      }: {
        input: {
          authorId: string;
          nextToken: string | null;
          isRefresh: boolean;
        };
      }) => {
        const { authorId, nextToken, isRefresh } = input;

        const { data, error } = await client.query<
          GetAuthorMomentsQuery,
          GetAuthorMomentsQueryVariables
        >({
          query: GetAuthorMomentsDocument,
          variables: {
            authorId,
            nextToken,
            limit: AUTHOR_MOMENTS_PAGE_LIMIT,
          },
          fetchPolicy: isRefresh ? "network-only" : "cache-first",
        });

        if (error) {
          throw new Error(error.message);
        }

        if (!data?.getAuthorMoments) {
          throw new Error("No data returned from getAuthorMoments");
        }

        return data.getAuthorMoments;
      },
    ),
  },
  actions: {
    clearError: assign({
      error: () => null,
    }),
    assignSetMedia: assign(({ event }) => {
      if (event.type !== "SET_MEDIA") {
        return {};
      }
      return {
        visibleMediaMomentId: event.payload.momentId,
      };
    }),
    assignActiveContext: assign(({ event }) => {
      if (event.type !== "SET_ACTIVE_CONTEXT") {
        return {};
      }
      return {
        isScreenActive: event.payload.active,
      };
    }),
    toggleMuted: assign({
      isMuted: ({ context }) => !context.isMuted,
    }),
    removeMomentFromList: assign(({ context, event }) => {
      if (event.type !== "REMOVE_MOMENT_FROM_LIST") {
        return {};
      }
      const momentId = event.payload.momentId;
      const moments = context.moments.filter(
        (m: ProfileMomentItem) => m.id !== momentId,
      );
      const visibleMediaMomentId =
        context.visibleMediaMomentId === momentId
          ? null
          : context.visibleMediaMomentId;

      return {
        moments,
        resultCount: moments.length,
        scrollToIndexNonce: context.scrollToIndexNonce + 1,
        visibleMediaMomentId,
      };
    }),
    clearAuthorMoments: assign(({ context }) => ({
      moments: [],
      nextToken: null,
      resultCount: 0,
      visibleMediaMomentId: null,
      scrollToIndexNonce: context.scrollToIndexNonce + 1,
    })),
  },
}).createMachine({
  id: "profile",
  initial: "gettingMoments",
  context: ({ input }) => ({
    authorId: input.authorId,
    moments: [],
    nextToken: null,
    resultCount: 0,
    error: null,
    visibleMediaMomentId: null,
    isScreenActive: false,
    isMuted: false,
    scrollToIndexNonce: 0,
  }),
  on: {
    SET_MEDIA: {
      actions: "assignSetMedia",
    },
    SET_ACTIVE_CONTEXT: {
      actions: "assignActiveContext",
    },
    TOGGLE_MUTED: {
      actions: "toggleMuted",
    },
    REMOVE_MOMENT_FROM_LIST: {
      actions: "removeMomentFromList",
    },
    CLEAR_AUTHOR_MOMENTS: {
      actions: "clearAuthorMoments",
    },
  },
  states: {
    gettingMoments: {
      on: {
        ...profileUiEvents,
        REFRESH: {
          target: "refreshingMoments",
          actions: "clearError",
        },
      },
      invoke: {
        src: "fetchAuthorMoments",
        input: ({ context }) => ({
          authorId: context.authorId,
          nextToken: null,
          isRefresh: false,
        }),
        onDone: {
          target: "idle",
          actions: assign(({ context, event }) => ({
            moments: mergeUniqueProfileMoments(
              context.moments,
              event.output.items,
            ),
            nextToken: event.output.nextToken ?? null,
            resultCount: event.output.resultCount,
          })),
        },
        onError: {
          target: "error",
          actions: assign(({ event }) => ({
            error: (event.error as Error).message,
          })),
        },
      },
    },
    idle: {
      on: {
        ...profileUiEvents,
        REFRESH: {
          target: "refreshingMoments",
          actions: "clearError",
        },
        LOAD_MORE: {
          guard: "canLoadMore",
          target: "loadingMoreMoments",
          actions: "clearError",
        },
      },
    },
    refreshingMoments: {
      on: {
        ...profileUiEvents,
        REFRESH: {
          target: "refreshingMoments",
          actions: "clearError",
        },
      },
      invoke: {
        src: "fetchAuthorMoments",
        input: ({ context }) => ({
          authorId: context.authorId,
          nextToken: null,
          isRefresh: true,
        }),
        onDone: {
          target: "idle",
          actions: assign(({ event }) => ({
            moments: mergeUniqueProfileMoments([], event.output.items),
            nextToken: event.output.nextToken ?? null,
            resultCount: event.output.resultCount,
          })),
        },
        onError: {
          target: "idle",
        },
      },
    },
    loadingMoreMoments: {
      on: {
        ...profileUiEvents,
        REFRESH: {
          target: "refreshingMoments",
          actions: "clearError",
        },
      },
      invoke: {
        src: "fetchAuthorMoments",
        input: ({ context }) => ({
          authorId: context.authorId,
          nextToken: context.nextToken,
          isRefresh: false,
        }),
        onDone: {
          target: "idle",
          actions: assign(({ context, event }) => ({
            moments: mergeUniqueProfileMoments(
              context.moments,
              event.output.items,
            ),
            nextToken: event.output.nextToken ?? null,
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
        ...profileUiEvents,
        RETRY: {
          target: "gettingMoments",
          actions: "clearError",
        },
        REFRESH: {
          target: "refreshingMoments",
          actions: "clearError",
        },
      },
    },
  },
});

export type ProfileMachineActorRef = ActorRefFrom<typeof profileMachine>;
