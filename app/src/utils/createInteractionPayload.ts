import type {
  Author,
  CreateInteractionInput,
  Moment,
  User,
  ViewerInput,
} from "@/gql/graphql";

/**
 * Minimal moment fields required to build a `CreateInteractionInput`.
 * `sequence` is required because the API input does not accept null.
 */
export type MomentForCreateInteraction = Pick<Moment, "id" | "author"> & {
  sequence: number;
};

/**
 * Viewer identity for interactions: compatible with `Author`, `User`, or `ViewerInput`.
 */
export type ViewerForCreateInteraction =
  | Pick<Author, "id" | "name" | "avatar">
  | Pick<User, "id" | "name" | "avatar">
  | ViewerInput;

function toViewerInput(viewer: ViewerForCreateInteraction): ViewerInput {
  return {
    id: viewer.id,
    name: viewer.name ?? undefined,
    avatar: viewer.avatar ?? undefined,
  };
}

export type BuildCreateInteractionInputParams = {
  moment: MomentForCreateInteraction;
  viewer: ViewerForCreateInteraction;
  applauseCount: number;
  previousApplauseCount: number;
  /** Unix seconds when the interaction is recorded (caller supplies for deterministic tests). */
  interactionCreatedAtUnixSeconds: number;
};

/**
 * Builds a `CreateInteractionInput` for `createInteraction`.
 * Does not perform network I/O or read app state.
 */
export function buildCreateInteractionInput({
  moment,
  viewer,
  applauseCount,
  previousApplauseCount,
  interactionCreatedAtUnixSeconds,
}: BuildCreateInteractionInputParams): CreateInteractionInput {
  return {
    applauseCount,
    authorId: moment.author.id,
    interactionCreatedAt: interactionCreatedAtUnixSeconds,
    momentId: moment.id,
    momentSequence: moment.sequence,
    previousApplauseCount,
    viewer: toViewerInput(viewer),
  };
}
