import type { ActorRefFrom } from "xstate";
import { assign, fromPromise, setup } from "xstate";

import type { Author, MomentType } from "@/gql/graphql";
import type { MomentUploadJob } from "@/services/momentUploadQueue";
import type { CropTransform } from "@/types/cropTransform";
import type { StagedItem } from "@/types/mediaItem";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ShareMomentInput = {
  localUri: string;
  mediaType: MomentType;
  source: "camera" | "library";
  // Optional caption pre-filled from a deep-link or future draft restore.
  // Normally left undefined — the description comes via the SHARE event.
  description?: string | null;
  // Crop/reposition metadata from the adjust screen. Null when skipped.
  cropTransform?: CropTransform | null;
  // For multi-media Moments: all staged items from the staging store.
  // Null for single-media Moments.
  mediaItems?: StagedItem[] | null;
};

export type ShareMomentEvent =
  // SHARE now carries the caption the user typed on the caption screen.
  // null means the field was left blank and the backend should omit it.
  | { type: "SHARE"; description: string | null }
  | { type: "GO_BACK" }
  | { type: "RETRY" };

type ShareMomentContext = {
  localUri: string;
  mediaType: MomentType;
  source: "camera" | "library";
  // Captured from the SHARE event and forwarded to the upload job so the
  // backend receives the caption alongside the media registration request.
  description: string | null;
  cropTransform: CropTransform | null;
  // For multi-media Moments. Null for single-media Moments.
  mediaItems: StagedItem[] | null;
  enqueuedJob: MomentUploadJob | null;
  error: string | null;
};

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

export const shareMomentMachine = setup({
  types: {
    context: {} as ShareMomentContext,
    events: {} as ShareMomentEvent,
    input: {} as ShareMomentInput,
  },
  actors: {
    enqueueMoment: fromPromise(
      async ({
        input,
      }: {
        input: {
          localUri: string;
          mediaType: MomentType;
          source: "camera" | "library";
          // description flows in from context so the upload job can persist it
          // and later forward it to the create-moment REST endpoint.
          description: string | null;
          cropTransform: CropTransform | null;
          mediaItems: StagedItem[] | null;
        };
      }) => {
        const { enqueue, flush } = await import(
          "@/services/momentUploadQueue"
        );
        const { processMomentUploadJob } = await import(
          "@/services/momentUploadProcessor"
        );
        const { writeOptimisticMomentToFeed } = await import(
          "@/services/momentOptimisticFeed"
        );
        const { mmkvStorage, StorageKeys } = await import(
          "@/services/storage"
        );

        const author = mmkvStorage.get<Author>(StorageKeys.AUTHOR);
        if (!author) {
          throw new Error("Author not found — user may not be authenticated.");
        }

        const authorSlice = {
          id: author.id,
          name: author.name,
          avatar: author.avatar,
        };

        const job = enqueue({
          localMediaUri: input.localUri,
          mediaType: input.mediaType,
          isLocal: input.source === "camera",
          author: authorSlice,
          // Forward the caption so it is stored with the job and later sent
          // to the backend in the create-moment REST request.
          description: input.description,
          cropTransform: input.cropTransform,
          mediaItems: input.mediaItems,
        });

        writeOptimisticMomentToFeed({
          momentId: job.id,
          authorId: author.id,
          author: authorSlice,
          localMediaUri: input.localUri,
          mediaType: input.mediaType,
          isLocal: input.source === "camera",
          // Forward the caption so the feed card shows it immediately —
          // without this the optimistic entry would always display null.
          description: input.description,
          cropTransform: input.cropTransform,
          mediaItems: input.mediaItems,
        });

        flush(processMomentUploadJob).catch((err) => {
          if (__DEV__) {
            console.error("[shareMoment] flush failed:", err);
          }
        });

        return job;
      },
    ),
  },
  actions: {
    assignEnqueuedJob: assign(({ event }) => {
      const done = event as unknown as { output: MomentUploadJob };
      return { enqueuedJob: done.output, error: null };
    }),
    assignEnqueueError: assign(({ event }) => {
      let message = "Could not queue moment for upload.";
      if (typeof event === "object" && event !== null && "error" in event) {
        const err = (event as { error: unknown }).error;
        if (err instanceof Error) {
          message = err.message;
        }
      }
      return { error: message };
    }),
    clearError: assign(() => ({ error: null })),
    // Reads the description from the SHARE event and stores it in context
    // so the enqueuing state can pass it to the upload actor as input.
    assignDescription: assign(({ event }) => {
      if (event.type !== "SHARE") return {};
      return { description: event.description ?? null };
    }),
  },
}).createMachine({
  id: "shareMoment",
  initial: "preview",
  context: ({ input }) => ({
    localUri: input.localUri,
    mediaType: input.mediaType,
    source: input.source,
    // Seed from input if provided (e.g. draft restore). Normally null until
    // the user taps Post and the SHARE event carries the description.
    description: input.description ?? null,
    cropTransform: input.cropTransform ?? null,
    mediaItems: input.mediaItems ?? null,
    enqueuedJob: null,
    error: null,
  }),
  states: {
    preview: {
      on: {
        SHARE: {
          target: "enqueuing",
          // Save the description from the event into context before the
          // enqueuing state starts, so the actor can read it as input.
          actions: "assignDescription",
        },
        GO_BACK: { target: "dismissed" },
      },
    },
    enqueuing: {
      invoke: {
        src: "enqueueMoment",
        input: ({ context }) => ({
          localUri: context.localUri,
          mediaType: context.mediaType,
          source: context.source,
          // Pass the description that was saved by assignDescription so the
          // upload job can carry it through to the REST endpoint.
          description: context.description,
          cropTransform: context.cropTransform,
          mediaItems: context.mediaItems,
        }),
        onDone: {
          target: "queued",
          actions: "assignEnqueuedJob",
        },
        onError: {
          target: "preview",
          actions: "assignEnqueueError",
        },
      },
    },
    queued: {
      type: "final",
    },
    dismissed: {
      type: "final",
    },
  },
});

export type ShareMomentActorRef = ActorRefFrom<typeof shareMomentMachine>;
