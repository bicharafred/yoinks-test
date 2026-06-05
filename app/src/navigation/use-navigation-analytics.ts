import { useGlobalSearchParams, usePathname } from "expo-router";
import { useEffect, useRef } from "react";

/**
 * Payload for a single "screen view" derived from Expo Router state.
 * Uses pathname + global params instead of a navigation ref (see Expo Router
 * `useGlobalSearchParams` docs: useful for analytics).
 */
export type NavigationScreenView = {
  pathname: string;
  globalParams: ReturnType<typeof useGlobalSearchParams>;
};

function serializeGlobalParams(
  params: ReturnType<typeof useGlobalSearchParams>,
): string {
  const keys = Object.keys(params).sort();
  const stable: Record<string, unknown> = {};
  for (const k of keys) {
    stable[k] = params[k as keyof typeof params];
  }
  return JSON.stringify(stable);
}

/**
 * Invokes `onScreenView` whenever the active pathname or global URL parameters
 * change. Supersedes legacy `attachScreenTracking(navigationRef.current)` by
 * subscribing to Expo Router hooks (no nullable ref during render).
 *
 * Pass a stable callback (`useCallback`) if the parent re-renders often; the
 * hook keeps the latest handler in a ref so the effect dependency list stays
 * minimal.
 */
export function useNavigationAnalytics(
  onScreenView: (view: NavigationScreenView) => void,
): void {
  const pathname = usePathname();
  const globalParams = useGlobalSearchParams();
  const onScreenViewRef = useRef(onScreenView);
  onScreenViewRef.current = onScreenView;

  const paramsKey = serializeGlobalParams(globalParams);

  useEffect(() => {
    onScreenViewRef.current({ pathname, globalParams });
    // Omitted: `globalParams` in deps — identity may be unstable; `paramsKey` content-addresses it.
  }, [pathname, paramsKey]);
}
