import { useAuth } from "@clerk/clerk-expo";
import { ConvexProvider } from "convex/react";
import { useEffect, type ReactNode } from "react";
import { convex } from "@/lib/convex";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      convex.clearAuth();
      return;
    }

    const fetchAccessToken = async ({
      forceRefreshToken,
    }: {
      forceRefreshToken: boolean;
    }) => {
      try {
        return await getToken({ template: "convex", skipCache: forceRefreshToken });
      } catch {
        return null;
      }
    };

    convex.setAuth(fetchAccessToken);

    return () => {
      convex.clearAuth();
    };
  }, [getToken, isLoaded, isSignedIn]);

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
