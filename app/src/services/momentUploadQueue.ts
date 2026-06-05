import type { Author, MomentType } from "@/gql/graphql";
import { storage, StorageKeys } from "@/services/storage";
import type { CropTransform } from "@/types/cropTransform";
import type { StagedItem } from "@/types/mediaItem";

export type { CropTransform };
export type { StagedItem };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MomentUploadJobStatus =
  | "pending"
  | "processing"
  | "uploading"
  | "failed";

export type MomentUploadJob = {
  id: string;
  enqueuedAtUnixMs: number;
  status: MomentUploadJobStatus;
  failureCount: number;
  localMediaUri: string;
  mediaType: MomentType;
  isLocal: boolean;
  author: Pick<Author, "id" | "name" | "avatar">;
  // Optional caption entered by the user on the caption screen.
  // Persisted with the job so it survives app restarts (jobs are stored in
  // MMKV) and is forwarded to the create-moment REST endpoint on upload.
  description: string | null;
  // Crop/reposition metadata captured on the adjust screen. Null when the
  // user skipped adjustment. Applied at render time only — the original file
  // is never physically cropped.
  cropTransform: CropTransform | null;
  // All staged items for multi-media Moments. Null for single-media Moments.
  // When non-null, localMediaUri contains the first item's URI (for backward compat).
  mediaItems: StagedItem[] | null;
  /** Set once the backend acknowledges (or once the optimistic write creates it). */
  remoteMomentId: string | null;
};

export type MomentUploadFlushResult = "success" | "retry" | "discard";

export type MomentUploadFlushHandler = (
  job: MomentUploadJob,
) => Promise<MomentUploadFlushResult>;

export type MomentUploadFlushSummary = {
  succeeded: number;
  discarded: number;
  stoppedOnRetry: boolean;
  remaining: number;
};

const MAX_ATTEMPTS = 3;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let flushChain: Promise<unknown> = Promise.resolve();

function createJobId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") {
    return c.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function readJobsFromStorage(): MomentUploadJob[] {
  const raw = storage.getString(StorageKeys.MOMENT_UPLOAD_QUEUE);
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isMomentUploadJob);
  } catch {
    return [];
  }
}

function writeJobsToStorage(jobs: MomentUploadJob[]): void {
  storage.set(StorageKeys.MOMENT_UPLOAD_QUEUE, JSON.stringify(jobs));
}

function isMomentUploadJob(value: unknown): value is MomentUploadJob {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.enqueuedAtUnixMs === "number" &&
    typeof v.localMediaUri === "string" &&
    typeof v.mediaType === "string" &&
    typeof v.author === "object" &&
    v.author !== null
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getPending(): MomentUploadJob[] {
  return [...readJobsFromStorage()];
}

export function getPendingCount(): number {
  return readJobsFromStorage().length;
}

export function peekNext(): MomentUploadJob | null {
  const jobs = readJobsFromStorage();
  return jobs[0] ?? null;
}

/**
 * Enqueue a new moment for background processing + upload.
 * Returns the created job with a generated `id` that doubles as the optimistic moment ID.
 */
export function enqueue(params: {
  localMediaUri: string;
  mediaType: MomentType;
  isLocal: boolean;
  author: Pick<Author, "id" | "name" | "avatar">;
  // Optional — undefined is treated as no caption (stored as null in the job).
  description?: string | null;
  cropTransform?: CropTransform | null;
  // For multi-media Moments. Null for single-media Moments.
  mediaItems?: StagedItem[] | null;
}): MomentUploadJob {
  const job: MomentUploadJob = {
    id: createJobId(),
    enqueuedAtUnixMs: Date.now(),
    status: "pending",
    failureCount: 0,
    localMediaUri: params.localMediaUri,
    mediaType: params.mediaType,
    isLocal: params.isLocal,
    author: { ...params.author },
    // Normalise undefined to null so the stored JSON always has this key,
    // making isMomentUploadJob validation simpler and future-proof.
    description: params.description ?? null,
    cropTransform: params.cropTransform ?? null,
    mediaItems: params.mediaItems ?? null,
    remoteMomentId: null,
  };
  const jobs = readJobsFromStorage();
  jobs.push(job);
  writeJobsToStorage(jobs);
  return job;
}

export function removeByJobId(jobId: string): boolean {
  const jobs = readJobsFromStorage();
  const next = jobs.filter((j) => j.id !== jobId);
  if (next.length === jobs.length) {
    return false;
  }
  writeJobsToStorage(next);
  return true;
}

export function updateJobStatus(
  jobId: string,
  status: MomentUploadJobStatus,
): void {
  const jobs = readJobsFromStorage();
  const target = jobs.find((j) => j.id === jobId);
  if (target) {
    target.status = status;
    if (status === "failed") {
      target.failureCount += 1;
    }
    writeJobsToStorage(jobs);
  }
}

export function clear(): void {
  storage.remove(StorageKeys.MOMENT_UPLOAD_QUEUE);
}

/**
 * Processes jobs sequentially (FIFO). The provided handler does the real work:
 * media processing, pre-signed URL fetch, S3 upload, and `createMoment` mutation.
 *
 * Returning `"retry"` leaves the job for a later pass (up to MAX_ATTEMPTS).
 * Returning `"discard"` drops the job.
 * Returning `"success"` removes the job.
 */
export function flush(
  handler: MomentUploadFlushHandler,
): Promise<MomentUploadFlushSummary> {
  const run = async (): Promise<MomentUploadFlushSummary> => {
    let succeeded = 0;
    let discarded = 0;
    let stoppedOnRetry = false;

    for (;;) {
      const head = readJobsFromStorage()[0];
      if (!head) {
        break;
      }

      updateJobStatus(head.id, "processing");

      const result = await handler(head);

      if (result === "success") {
        removeByJobId(head.id);
        succeeded++;
        continue;
      }

      if (result === "retry") {
        if (head.failureCount + 1 >= MAX_ATTEMPTS) {
          removeByJobId(head.id);
          discarded++;
          continue;
        }
        updateJobStatus(head.id, "failed");
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
    () => undefined,
  );
  return promise;
}
