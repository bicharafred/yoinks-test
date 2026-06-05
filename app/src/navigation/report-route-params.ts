import type { Author, Moment } from "@/gql/graphql";

/**
 * Search params for `/(app)/report` from the moment overflow menu.
 * All values are serialized as strings in the router.
 */
export type ReportRouteType = "content" | "user";

export interface ReportRouteParams {
  type: ReportRouteType;
  authorId: string;
  authorName: string;
  momentId: string;
}

type MomentForReport = Pick<Moment, "id"> & {
  author: Pick<Author, "id" | "name">;
};

function paramToString(
  value: string | string[] | undefined
): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Build router params for `router.push` from the current moment.
 */
export function buildReportRouteParams(
  type: ReportRouteType,
  moment: MomentForReport
): ReportRouteParams {
  return {
    type,
    authorId: moment.author.id,
    authorName: moment.author.name,
    momentId: moment.id,
  };
}

/**
 * Convert to Expo Router `params` (string values only).
 */
export function serializeReportRouteParams(
  p: ReportRouteParams
): Record<keyof ReportRouteParams, string> {
  return {
    type: p.type,
    authorId: p.authorId,
    authorName: p.authorName,
    momentId: p.momentId,
  };
}

/**
 * Read search params on the report screen. Returns `null` if the contract is incomplete or invalid.
 */
export function parseReportRouteParams(
  raw: Record<string, string | string[] | undefined>
): ReportRouteParams | null {
  const type = paramToString(raw.type);
  const authorId = paramToString(raw.authorId);
  const authorName = paramToString(raw.authorName);
  const momentId = paramToString(raw.momentId);
  if (type !== "content" && type !== "user") {
    return null;
  }
  if (!authorId || !authorName || !momentId) {
    return null;
  }
  return { type, authorId, authorName, momentId };
}
