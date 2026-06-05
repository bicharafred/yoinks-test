import {
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  differenceInSeconds,
  parseISO,
} from "date-fns";

/**
 * Short relative label matching legacy inbox semantics: pick the largest unit
 * among days / hours / minutes / seconds (floor). Sub-minute values use seconds
 * with a minimum of 1s.
 */
export function formatNotificationRelativeTime(
  createdAtIso: string,
  now: Date = new Date(),
): string {
  const then = parseISO(createdAtIso);
  if (Number.isNaN(then.getTime())) {
    return "";
  }
  let seconds = differenceInSeconds(now, then);
  if (seconds < 0) {
    seconds = 0;
  }

  if (seconds < 60) {
    return `${Math.max(1, seconds)}s`;
  }

  const minutes = differenceInMinutes(now, then);
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = differenceInHours(now, then);
  if (hours < 24) {
    return `${hours}h`;
  }

  const days = differenceInDays(now, then);
  return `${days}d`;
}
