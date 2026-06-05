import { APP_CREATE_MOMENT_HREF } from "@/navigation/app-tabs.config";
import { useRouter } from "expo-router";
import { useLayoutEffect } from "react";

/**
 * Fallback when navigation targets the Create tab segment directly (e.g. deep link).
 * Primary entry is `router.push(APP_CREATE_MOMENT_HREF)` from the tab bar (moment-creator UI spec).
 */
export default function CreateTabEntryScreen() {
  const router = useRouter();

  useLayoutEffect(() => {
    router.replace(APP_CREATE_MOMENT_HREF);
  }, [router]);

  return null;
}
