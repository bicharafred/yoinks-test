import type { CreateInteractionInput } from "@/gql/graphql";
import { storage, StorageKeys } from "@/services/storage";

/**
 * A persisted `createInteraction` job. `input` is the GraphQL variable payload; Step 21
 * will resolve `previousApplauseCount` at mutation time when wiring the real processor.
 */
export type InteractionQueueJob = {
  id: string;
  enqueuedAtUnixMs: number;
  input: CreateInteractionInput;
};

export type InteractionFlushResult = "success" | "retry" | "discard";

/**
 * Step 19 hook point: implement with Apollo `CreateInteraction` in Step 21. Returning
 * `"retry"` leaves the head job in place; `"discard"` drops it; `"success"` removes it.
 */
export type InteractionFlushHandler = (
  job: InteractionQueueJob
) => Promise<InteractionFlushResult>;

export type InteractionFlushSummary = {
  succeeded: number;
  discarded: number;
  /** True when a handler returned `"retry"` and the head job was left for a later pass. */
  stoppedOnRetry: boolean;
  remaining: number;
};

let flushChain: Promise<unknown> = Promise.resolve();

function createJobId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") {
    return c.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function isCreateInteractionInput(value: unknown): value is CreateInteractionInput {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const v = value as Record<string, unknown>;
  if (
    typeof v.applauseCount !== "number" ||
    typeof v.authorId !== "string" ||
    typeof v.interactionCreatedAt !== "number" ||
    typeof v.momentId !== "string" ||
    typeof v.momentSequence !== "number" ||
    typeof v.previousApplauseCount !== "number" ||
    typeof v.viewer !== "object" ||
    v.viewer === null
  ) {
    return false;
  }
  const viewer = v.viewer as Record<string, unknown>;
  return typeof viewer.id === "string";
}

function isInteractionQueueJob(value: unknown): value is InteractionQueueJob {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.enqueuedAtUnixMs === "number" &&
    isCreateInteractionInput(v.input)
  );
}

function readJobsFromStorage(): InteractionQueueJob[] {
  const raw = storage.getString(StorageKeys.INTERACTION_QUEUE);
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isInteractionQueueJob);
  } catch {
    return [];
  }
}

function writeJobsToStorage(jobs: InteractionQueueJob[]): void {
  storage.set(StorageKeys.INTERACTION_QUEUE, JSON.stringify(jobs));
}

/**
 * All pending jobs in enqueue order (FIFO). Returns a copy.
 */
export function getPending(): InteractionQueueJob[] {
  return [...readJobsFromStorage()];
}

export function getPendingCount(): number {
  return readJobsFromStorage().length;
}

/**
 * The next job to process, or null if the queue is empty.
 */
export function peekNext(): InteractionQueueJob | null {
  const jobs = readJobsFromStorage();
  return jobs[0] ?? null;
}

/**
 * Add a `createInteraction` job and persist. Does not run the flush handler.
 */
export function enqueue(input: CreateInteractionInput): InteractionQueueJob {
  const job: InteractionQueueJob = {
    id: createJobId(),
    enqueuedAtUnixMs: Date.now(),
    input: { ...input },
  };
  const jobs = readJobsFromStorage();
  jobs.push(job);
  writeJobsToStorage(jobs);
  return job;
}

/**
 * Remove a single job by id. Returns whether a row was removed.
 */
export function removeByJobId(jobId: string): boolean {
  const jobs = readJobsFromStorage();
  const next = jobs.filter((j) => j.id !== jobId);
  if (next.length === jobs.length) {
    return false;
  }
  writeJobsToStorage(next);
  return true;
}

/**
 * Remove every pending job targeting `momentId` (e.g. before delete, or to cancel
 * outstanding debounced claps for that card).
 */
export function cancelByMomentId(momentId: string): number {
  const jobs = readJobsFromStorage();
  const next = jobs.filter((j) => j.input.momentId !== momentId);
  const removed = jobs.length - next.length;
  if (removed > 0) {
    writeJobsToStorage(next);
  }
  return removed;
}

/** Alias for `cancelByMomentId` — matches plan wording. */
export const removeByMomentId = cancelByMomentId;

/**
 * Clear all pending jobs.
 */
export function clear(): void {
  storage.remove(StorageKeys.INTERACTION_QUEUE);
}

/**
 * Process jobs in order. Each handler invocation runs after the previous flush run finishes.
 * The handler (Step 21) performs the real mutation; this step only coordinates persistence.
 *
 * App lifecycle: call `flush` only from the root layout (`src/app/_layout.tsx` — mount and
 * AppState `"active"`). Do not add flush subscriptions in tab or screen components; those
 * layers use `enqueue` only.
 */
export function flush(handler: InteractionFlushHandler): Promise<InteractionFlushSummary> {
  const run = async (): Promise<InteractionFlushSummary> => {
    let succeeded = 0;
    let discarded = 0;
    let stoppedOnRetry = false;

    for (;;) {
      const head = readJobsFromStorage()[0];
      if (!head) {
        break;
      }
      const result = await handler(head);
      if (result === "success") {
        removeByJobId(head.id);
        succeeded++;
        continue;
      }
      if (result === "retry") {
        stoppedOnRetry = true;
        break;
      }
      removeByJobId(head.id);
      discarded++;
    }

    return {
      succeeded,
      discarded,
      stoppedOnRetry,
      remaining: readJobsFromStorage().length,
    };
  };

  const promise = flushChain.then(run);
  flushChain = promise.then(
    () => undefined,
    () => undefined
  );
  return promise;
}
