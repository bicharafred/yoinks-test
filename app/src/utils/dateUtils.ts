import { formatISO, fromUnixTime, parseISO } from "date-fns";

export const utcDateToLocalEpoch = (date: string) => {
  const parsedDate = parseISO(date);
  return parsedDate.getTime();
};

export const epochToDate = (date: number) => {
  const parsedDate = fromUnixTime(date);
  return formatISO(parsedDate);
};

export const formatDuration = (totalSeconds: number) => {
  const days = Math.floor(totalSeconds / 86400); // 60 * 60 * 24
  const hours = Math.floor(totalSeconds / 3600); // 60 * 60
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(Math.max(1, totalSeconds % 60));

  if (days >= 1) {
    return `${days}d`;
  } else if (hours >= 1) {
    return `${hours}h`;
  } else if (minutes >= 1) {
    return `${minutes}m`;
  } else {
    return `${seconds}s`;
  }
};
