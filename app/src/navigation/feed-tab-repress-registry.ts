/**
 * Lets the Feed screen register a no-arg handler so the tab bar can request
 * scroll-to-top without passing navigation or actors through XState machines.
 */
type FeedTabRepressHandler = () => void;

let handler: FeedTabRepressHandler | null = null;

export function setFeedTabRepressHandler(
  next: FeedTabRepressHandler | null,
): void {
  handler = next;
}

export function notifyFeedTabRepress(): void {
  handler?.();
}
