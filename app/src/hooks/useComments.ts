import { useCallback, useState } from "react";

import type { Author, Comment } from "@/gql/graphql";
import {
  CreateCommentDocument,
  type CreateCommentMutation,
  type CreateCommentMutationVariables,
  GetCommentsByMomentDocument,
  type GetCommentsByMomentQuery,
  type GetCommentsByMomentQueryVariables,
} from "@/gql/graphql";
import { client } from "@/services/client";

/**
 * Manages the comment thread for a single Moment.
 *
 * fetchComments() loads (or reloads) comments from the server.
 * submitComment() posts a new top-level comment and prepends it to the local
 * list immediately, then bumps the Moment's commentCount in the Apollo cache
 * so the feed card icon updates without a full feed refresh.
 * submitReply() adds a reply client-side (no dedicated GraphQL mutation yet)
 * and also bumps commentCount — MVP product rule counts replies in the total.
 */
export function useComments(momentId: string) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nextToken, setNextToken] = useState<string | null>(null);

  const fetchComments = useCallback(
    async (token: string | null = null) => {
      setIsLoading(true);
      try {
        const result = await client.query<
          GetCommentsByMomentQuery,
          GetCommentsByMomentQueryVariables
        >({
          query: GetCommentsByMomentDocument,
          variables: { momentId, nextToken: token },
          fetchPolicy: "network-only",
        });

        const data = result.data?.commentsByMoment;
        if (data) {
          const sorted = data.items
            .slice()
            .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
          setComments((prev) => (token ? [...prev, ...sorted] : sorted));
          setNextToken(data.nextToken ?? null);
          // Sync the Apollo cache on first load so the feed badge reflects the
          // top-level comment count. Replies are excluded per MVP rule.
          if (!token) {
            const topLevelCount = sorted.filter((c) => !c.parentCommentId).length;
            syncCommentCount(momentId, topLevelCount);
          }
        }
      } catch (error) {
        if (__DEV__) {
          console.error("[useComments] fetch failed:", momentId, error);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [momentId],
  );

  // Posts a new top-level comment. Prepends it to the local list and bumps
  // commentCount in the Apollo cache so the feed card updates immediately.
  const submitComment = useCallback(
    async (
      text: string,
      author: Pick<Author, "id" | "name" | "avatar">,
    ): Promise<boolean> => {
      setIsSubmitting(true);
      try {
        const result = await client.mutate<
          CreateCommentMutation,
          CreateCommentMutationVariables
        >({
          mutation: CreateCommentDocument,
          variables: { input: { momentId, text, authorId: author.id } },
        });

        const newComment = result.data?.createComment;
        if (newComment) {
          setComments((prev) => [newComment, ...prev]);
          bumpCommentCount(momentId);
          return true;
        }
      } catch (error) {
        if (__DEV__) {
          console.error("[useComments] submitComment failed:", momentId, error);
        }
      } finally {
        setIsSubmitting(false);
      }
      return false;
    },
    [momentId],
  );

  // Posts a reply via the same createComment mutation, with parentCommentId set.
  // The reply is stored in db.comments server-side. Feed commentCount is NOT
  // incremented — only top-level comments count toward the badge.
  const submitReply = useCallback(
    async (
      text: string,
      author: Pick<Author, "id" | "name" | "avatar">,
      parentCommentId: string,
    ): Promise<{ id: string; createdAt: number } | null> => {
      setIsSubmitting(true);
      try {
        const result = await client.mutate<
          CreateCommentMutation,
          CreateCommentMutationVariables
        >({
          mutation: CreateCommentDocument,
          variables: { input: { momentId, text, authorId: author.id, parentCommentId } },
        });

        const newReply = result.data?.createComment;
        if (newReply) {
          // Append to comments state so repliesByParentId in the sheet updates.
          setComments((prev) => [...prev, newReply]);
          return { id: newReply.id, createdAt: newReply.createdAt };
        }
      } catch (error) {
        if (__DEV__) {
          console.error("[useComments] submitReply failed:", momentId, error);
        }
      } finally {
        setIsSubmitting(false);
      }
      return null;
    },
    [momentId],
  );

  return {
    comments,
    isLoading,
    isSubmitting,
    nextToken,
    fetchComments,
    submitComment,
    submitReply,
  };
}

// Increments the denormalized commentCount on the Apollo-cached Moment so the
// feed card icon reflects the new total without a full feed refetch.
function bumpCommentCount(momentId: string): void {
  client.cache.modify({
    id: client.cache.identify({ __typename: "Moment", id: momentId }),
    fields: {
      commentCount(existing: number = 0) {
        return existing + 1;
      },
    },
  });
}

// Sets commentCount in the Apollo cache to the authoritative value returned by
// the server, correcting any stale optimistic value from the previous session.
function syncCommentCount(momentId: string, count: number): void {
  client.cache.modify({
    id: client.cache.identify({ __typename: "Moment", id: momentId }),
    fields: {
      commentCount() {
        return count;
      },
    },
  });
}
