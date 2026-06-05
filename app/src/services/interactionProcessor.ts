import {
  CreateInteractionDocument,
  CreateInteractionMutation,
  CreateInteractionMutationVariables,
  GetMomentDocument,
  GetMomentQuery,
  GetMomentQueryVariables,
} from "@/gql/graphql";
import { client } from "@/services/client";
import { InteractionQueueJob } from "@/services/interactionQueue";

export async function processCreateInteractionJob(
  job: InteractionQueueJob,
): Promise<"success" | "retry" | "discard"> {
  try {
    const { input } = job;

    // Resolve previousApplauseCount from the cache or network
    // This is crucial to ensure we don't overwrite newer claps with older ones
    let previousApplauseCount = input.previousApplauseCount;

    try {
      const { data } = await client.query<
        GetMomentQuery,
        GetMomentQueryVariables
      >({
        query: GetMomentDocument,
        variables: {
          input: {
            authorId: input.authorId,
            sequence: input.momentSequence,
          },
        },
        // We want to check the cache first, but if it's not there, fetch it
        fetchPolicy: "cache-first",
      });

      if (data?.getMoment) {
        previousApplauseCount = data.getMoment.viewerApplauseCount ?? 0;
      }
    } catch (error) {
      console.error("Failed to fetch moment for previousApplauseCount", error);
      // We can still proceed with the original previousApplauseCount if the fetch fails
    }

    const result = await client.mutate<
      CreateInteractionMutation,
      CreateInteractionMutationVariables
    >({
      mutation: CreateInteractionDocument,
      variables: {
        input: {
          ...input,
          previousApplauseCount,
        },
      },
    }) as any;

    if (result.errors && result.errors.length > 0) {
      console.error("GraphQL errors creating interaction:", result.errors);
      // If it's a validation error or something that won't be fixed by retrying, discard
      // For now, we'll retry on any error to be safe, but this could be refined
      return "retry";
    }

    return "success";
  } catch (error) {
    console.error("Error processing create interaction job:", error);
    return "retry";
  }
}
