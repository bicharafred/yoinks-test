import {
  BlockAuthorDocument,
  BlockAuthorMutation,
  BlockAuthorMutationVariables,
  HideMomentDocument,
  HideMomentMutation,
  HideMomentMutationVariables,
  UnblurMomentDocument,
  UnblurMomentMutation,
  UnblurMomentMutationVariables,
  GetMomentDocument,
  GetMomentQuery,
  GetMomentQueryVariables,
  GetInteractionsByMomentDocument,
  GetInteractionsByMomentQuery,
  GetInteractionsByMomentQueryVariables,
  Author,
  Moment,
} from "@/gql/graphql";
import { client } from "@/services/client";
import { evictCachedAuthorMomentsList } from "@/services/authorMomentsCache";
import { enqueue, removeByMomentId } from "@/services/interactionQueue";
import { buildCreateInteractionInput, ViewerForCreateInteraction } from "@/utils/createInteractionPayload";
import { useCallback, useState, useRef, useMemo } from "react";
// @ts-ignore
import debounce from "lodash.debounce";

interface UseMomentActionsProps {
  momentId: string;
  momentSequence: number;
  authorId: string;
}

export function useMomentActions({
  momentId,
  momentSequence,
  authorId,
}: UseMomentActionsProps) {
  const [isUnblurring, setIsUnblurring] = useState(false);
  const [isHiding, setIsHiding] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFetchingInteractions, setIsFetchingInteractions] = useState(false);

  const unblurMoment = useCallback(
    async (viewer: Pick<Author, "id" | "name" | "avatar">) => {
      setIsUnblurring(true);
      try {
        const result = await client.mutate<
          UnblurMomentMutation,
          UnblurMomentMutationVariables
        >({
          mutation: UnblurMomentDocument,
          variables: {
            input: {
              authorId,
              momentId,
              momentSequence,
              viewer: {
                id: viewer.id,
                name: viewer.name ?? undefined,
                avatar: viewer.avatar ?? undefined,
              },
            },
          },
        }) as any;

        if (result.errors && result.errors.length > 0) {
          throw new Error(result.errors[0].message);
        }

        // Immediately update the Apollo normalized cache so any query that
        // references this Moment reflects the unlocked state without waiting
        // for a full re-fetch. The feed machine holds a snapshot of
        // GetFeedMoments that is not reactively subscribed to cache changes,
        // so cache.modify alone is not sufficient — the Moment component also
        // applies an optimistic local state override (isLocallyUnblurred).
        client.cache.modify({
          id: client.cache.identify({ __typename: "Moment", id: momentId }),
          fields: {
            isBlurred: () => false,
            isLocked: () => false,
          },
        });

        // Fetch the updated moment to keep the cache fully in sync with the
        // server for subsequent renders (e.g. pull-to-refresh, navigation back).
        await client.query<GetMomentQuery, GetMomentQueryVariables>({
          query: GetMomentDocument,
          variables: {
            input: {
              authorId,
              sequence: momentSequence,
            },
          },
          fetchPolicy: "network-only",
        });

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to unblur moment",
        };
      } finally {
        setIsUnblurring(false);
      }
    },
    [authorId, momentId, momentSequence],
  );

  const hideMoment = useCallback(async () => {
    setIsHiding(true);
    try {
      const result = await client.mutate<
        HideMomentMutation,
        HideMomentMutationVariables
      >({
        mutation: HideMomentDocument,
        variables: {
          input: {
            hiddenMomentId: momentId,
          },
        },
      }) as any;

      if (result.errors && result.errors.length > 0) {
        throw new Error(result.errors[0].message);
      }

      // Evict the moment from the Apollo cache
      client.cache.evict({ id: `Moment:${momentId}` });
      evictCachedAuthorMomentsList(authorId);
      client.cache.gc();

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to hide moment",
      };
    } finally {
      setIsHiding(false);
    }
  }, [momentId, authorId]);

  const blockAuthor = useCallback(async () => {
    setIsBlocking(true);
    try {
      const result = await client.mutate<
        BlockAuthorMutation,
        BlockAuthorMutationVariables
      >({
        mutation: BlockAuthorDocument,
        variables: {
          input: {
            blockedAuthorId: authorId,
          },
        },
      }) as any;

      if (result.errors && result.errors.length > 0) {
        throw new Error(result.errors[0].message);
      }

      // Evict all moments by this author from cache
      client.cache.evict({ fieldName: "getFeedMoments" });
      evictCachedAuthorMomentsList(authorId);

      client.cache.modify({
        fields: {
          getFeedMoments(existing: any) {
            if (!existing?.items) return existing;
            return {
              ...existing,
              items: existing.items.filter(
                (moment: any) => moment?.author?.id !== authorId,
              ),
            };
          },
          getAuthorMoments(existing: any) {
            if (!existing?.items) return existing;
            return {
              ...existing,
              items: existing.items.filter(
                (moment: any) => moment?.author?.id !== authorId,
              ),
            };
          },
        },
      });

      client.cache.gc();

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to block author",
      };
    } finally {
      setIsBlocking(false);
    }
  }, [authorId]);

  const deleteMoment = useCallback(async () => {
    setIsDeleting(true);
    try {
      // Cancel pending queue work for that moment
      removeByMomentId(momentId);

      // Note: DeleteMoment mutation is not yet available in the API.
      // When it is, we will call it here.
      // const { errors } = await client.mutate<
      //   DeleteMomentMutation,
      //   DeleteMomentMutationVariables
      // >({
      //   mutation: DeleteMomentDocument,
      //   variables: {
      //     input: {
      //       momentId,
      //     },
      //   },
      // });

      // if (errors && errors.length > 0) {
      //   throw new Error(errors[0].message);
      // }

      // Evict the moment from the Apollo cache
      client.cache.evict({ id: `Moment:${momentId}` });
      evictCachedAuthorMomentsList(authorId);
      client.cache.gc();

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete moment",
      };
    } finally {
      setIsDeleting(false);
    }
  }, [momentId, authorId]);

  const getInteractions = useCallback(
    async (nextToken: string | null = null) => {
      setIsFetchingInteractions(true);
      try {
        const result = await client.query<
          GetInteractionsByMomentQuery,
          GetInteractionsByMomentQueryVariables
        >({
          query: GetInteractionsByMomentDocument,
          variables: {
            momentId,
            nextToken,
          },
          fetchPolicy: "network-only",
        }) as any;

        if (result.errors && result.errors.length > 0) {
          throw new Error(result.errors[0].message);
        }

        return {
          success: true,
          data: result.data?.interactionsByMoment,
        };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to fetch interactions",
        };
      } finally {
        setIsFetchingInteractions(false);
      }
    },
    [momentId],
  );

  const debouncedEnqueue = useMemo(
    () =>
      debounce(
        (
          viewer: ViewerForCreateInteraction,
          applauseCount: number,
          previousApplauseCount: number,
        ) => {
          const input = buildCreateInteractionInput({
            moment: { id: momentId, author: { id: authorId, name: '' }, sequence: momentSequence },
            viewer,
            applauseCount,
            previousApplauseCount,
            interactionCreatedAtUnixSeconds: Math.floor(Date.now() / 1000),
          });
          enqueue(input);
        },
        1000,
      ),
    [momentId, authorId, momentSequence],
  );

  const enqueueClap = useCallback(
    (
      viewer: ViewerForCreateInteraction,
      applauseCount: number,
      previousApplauseCount: number,
    ) => {
      debouncedEnqueue(viewer, applauseCount, previousApplauseCount);
    },
    [debouncedEnqueue],
  );

  return {
    unblurMoment,
    isUnblurring,
    hideMoment,
    isHiding,
    blockAuthor,
    isBlocking,
    deleteMoment,
    isDeleting,
    getInteractions,
    isFetchingInteractions,
    enqueueClap,
  };
}
