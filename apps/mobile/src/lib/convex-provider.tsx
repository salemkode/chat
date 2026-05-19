import { useAuth } from "@clerk/expo";
import { ConvexQueryCacheProvider } from "@chat/shared/convex-query-cache/provider";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type { ReactNode } from "react";
import { convex } from "@/lib/convex";

/** Keep idle Convex subscriptions warm longer on mobile for faster drawer/thread switches. */
const MOBILE_QUERY_CACHE_EXPIRATION_MS = 30 * 60 * 1000;

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <ConvexQueryCacheProvider expiration={MOBILE_QUERY_CACHE_EXPIRATION_MS}>
        {children}
      </ConvexQueryCacheProvider>
    </ConvexProviderWithClerk>
  );
}
