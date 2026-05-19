import { useAuth } from "@clerk/expo";
import { useEffect } from "react";
import {
  clearLocalOfflineCache,
  storeTrustedSession,
} from "@/offline/local-cache";

/** Persists the signed-in user id for synchronous offline cache reads on cold start. */
export function OfflineSessionSync() {
  const { isLoaded, isSignedIn, userId } = useAuth();

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn || !userId) {
      void clearLocalOfflineCache();
      return;
    }

    void storeTrustedSession({ userId, trusted: true });
  }, [isLoaded, isSignedIn, userId]);

  return null;
}
