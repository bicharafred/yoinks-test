import {
  UpdateUserNameDocument,
  type UpdateUserNameMutation,
  type UpdateUserNameMutationVariables,
} from "@/gql/graphql";
import { client } from "@/services/client";
import { resolveLocalUrl } from "@/utils/apiUrl";
import {
  fetchLocalUriAsBlob,
  stripUrlQuery,
} from "@/services/localImageBlob";

/**
 * Root / MMKV author is an object shaped like the REST login payload; mutations
 * return partial GraphQL `User` fields. Callers merge this into context and send
 * `SET_AUTHOR` so persistence stays on the root machine (no direct MMKV here).
 */
export type SettingsPersistedAuthor = Record<string, unknown> & {
  id: string;
};

const AVATAR_UPLOAD_UNAVAILABLE_MESSAGE =
  "Profile photo editing is not available in this test build yet.";

const DELETE_ACCOUNT_UNAVAILABLE_MESSAGE =
  "Account deletion is not available in this app build: the GraphQL schema does not expose a delete-account mutation.";

export type UpdateDisplayNameSuccess = {
  ok: true;
  mergedAuthor: SettingsPersistedAuthor;
};

export type UpdateDisplayNameFailure = {
  ok: false;
  message: string;
};

export type UpdateDisplayNameResult =
  | UpdateDisplayNameSuccess
  | UpdateDisplayNameFailure;

type UpdateUserNamePayload = UpdateUserNameMutation["updateUserName"];

/**
 * Runs `UpdateUserName` via Apollo and returns `{ ...currentAuthor, ...user }`
 * for the route to dispatch `{ type: "SET_AUTHOR", author: mergedAuthor }`.
 * Does not write storage; root handles MMKV on `SET_AUTHOR`.
 */
export async function updateDisplayName(args: {
  currentAuthor: SettingsPersistedAuthor;
  newName: string;
}): Promise<UpdateDisplayNameResult> {
  const trimmed = args.newName.trim();
  if (trimmed.length === 0) {
    return { ok: false, message: "Display name cannot be empty." };
  }
  if (trimmed.length > 20) {
    return { ok: false, message: "Display name cannot exceed 20 characters." };
  }

  const authorId = args.currentAuthor.id;
  if (typeof authorId !== "string" || authorId.length === 0) {
    return { ok: false, message: "Signed-in user id is missing." };
  }

  const result = await client.mutate<
    UpdateUserNameMutation,
    UpdateUserNameMutationVariables
  >({
    mutation: UpdateUserNameDocument,
    variables: {
      input: {
        id: authorId,
        name: trimmed,
      },
    },
  });

  if (result.error) {
    return { ok: false, message: result.error.message };
  }

  const updatedFromServer: UpdateUserNamePayload | null | undefined =
    result.data?.updateUserName;
  if (updatedFromServer == null) {
    return { ok: false, message: "No user returned from updateUserName." };
  }

  const mergedAuthor: SettingsPersistedAuthor = {
    ...args.currentAuthor,
    ...updatedFromServer,
  };

  return { ok: true, mergedAuthor };
}

export type AvatarUploadUnavailable = {
  ok: false;
  code: "avatar_upload_schema_unavailable";
  message: string;
};

export type AvatarUploadFailed = {
  ok: false;
  code: "avatar_upload_failed";
  message: string;
};

export type AvatarUploadSuccess = {
  ok: true;
  mergedAuthor: SettingsPersistedAuthor;
};

export type UploadAvatarResult =
  | AvatarUploadSuccess
  | AvatarUploadUnavailable
  | AvatarUploadFailed;

type AvatarSignedPutInstructions = {
  putUrl: string;
  /** Value for `Content-Type` on the PUT (e.g. image/jpeg). */
  contentType: string;
  /** Public avatar URL after upload; query string is stripped before merging into author. */
  avatarUrl: string;
};

async function fetchAvatarSignedPutInstructions(
  authorId: string,
): Promise<AvatarSignedPutInstructions | null> {
  try {
    const base = resolveLocalUrl(
      (process.env.EXPO_PUBLIC_API_BASE_REST ?? "").replace(/\/$/, ""),
    );
    const res = await fetch(`${base}/uploads/avatar/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authorId }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      putUrl?: string;
      contentType?: string;
      avatarUrl?: string;
    };
    if (!data.putUrl || !data.contentType || !data.avatarUrl) return null;
    return { putUrl: data.putUrl, contentType: data.contentType, avatarUrl: data.avatarUrl };
  } catch {
    return null;
  }
}

async function putBlobToSignedUrl(args: {
  putUrl: string;
  blob: Blob;
  contentType: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const response = await fetch(args.putUrl, {
      method: "PUT",
      headers: {
        "Content-Type": args.contentType,
        "Content-Length": String(args.blob.size),
      },
      body: args.blob,
    });
    if (!response.ok) {
      return {
        ok: false,
        message: `Upload failed (${response.status}).`,
      };
    }
    return { ok: true };
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : "Upload failed.";
    return { ok: false, message };
  }
}

/**
 * Uploads a locally picked avatar when the backend exposes a signed URL (or equivalent).
 * In local dev (__DEV__), uses the selected file URI directly — no backend required.
 */
export async function uploadAvatar(args: {
  localImageUri: string;
  currentAuthor: SettingsPersistedAuthor;
}): Promise<UploadAvatarResult> {
  const authorId =
    typeof args.currentAuthor.id === "string" ? args.currentAuthor.id : "";

  const instructions = await fetchAvatarSignedPutInstructions(authorId);
  if (instructions == null) {
    // Fallback for local dev when the mock server is not running.
    if (__DEV__) {
      const mergedAuthor: SettingsPersistedAuthor = {
        ...args.currentAuthor,
        avatar: args.localImageUri,
      };
      return { ok: true, mergedAuthor };
    }
    return {
      ok: false,
      code: "avatar_upload_schema_unavailable",
      message: AVATAR_UPLOAD_UNAVAILABLE_MESSAGE,
    };
  }

  let blob: Blob;
  try {
    blob = await fetchLocalUriAsBlob(args.localImageUri);
  } catch (cause) {
    const message =
      cause instanceof Error
        ? cause.message
        : "Could not read the selected image.";
    return { ok: false, code: "avatar_upload_failed", message };
  }

  const put = await putBlobToSignedUrl({
    putUrl: instructions.putUrl,
    blob,
    contentType: instructions.contentType,
  });
  if (!put.ok) {
    return { ok: false, code: "avatar_upload_failed", message: put.message };
  }

  const avatarWithoutQuery = stripUrlQuery(instructions.avatarUrl);

  // Persist the new avatar URL to the mock server so GraphQL profile queries
  // return the updated avatar after the next refresh.
  try {
    const base = resolveLocalUrl(
      (process.env.EXPO_PUBLIC_API_BASE_REST ?? "").replace(/\/$/, ""),
    );
    await fetch(`${base}/me/avatar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarUrl: avatarWithoutQuery, authorId }),
    });
  } catch {
    // Non-fatal: MMKV will still reflect the new avatar in-session.
  }

  const mergedAuthor: SettingsPersistedAuthor = {
    ...args.currentAuthor,
    avatar: avatarWithoutQuery,
  };

  return { ok: true, mergedAuthor };
}

export type DeleteAccountUnavailable = {
  ok: false;
  code: "delete_account_schema_unavailable";
  message: string;
};

/** Reserved for when the GraphQL schema exposes delete-account (see plan Step 38). */
export type DeleteAccountSuccess = {
  ok: true;
};

export type DeleteAccountResult = DeleteAccountSuccess | DeleteAccountUnavailable;

export async function deleteAccount(): Promise<DeleteAccountResult> {
  if (__DEV__) {
    const base = resolveLocalUrl(
      (process.env.EXPO_PUBLIC_API_BASE_REST ?? "").replace(/\/$/, ""),
    );
    try {
      const res = await fetch(`${base}/me/delete-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) return { ok: true };
    } catch {
      // fall through to unavailable response
    }
  }
  return {
    ok: false,
    code: "delete_account_schema_unavailable",
    message: DELETE_ACCOUNT_UNAVAILABLE_MESSAGE,
  };
}
