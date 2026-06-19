import { resolveViewerDisplayName } from "@chat/core/logic/display-name";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

export function useViewer() {
  const viewer = useQuery(api.users.viewer);

  if (!viewer) return null;

  return {
    id: viewer._id,
    name: resolveViewerDisplayName({
      displayName: viewer.settings?.displayName,
      fallbackName: viewer.name,
      email: viewer.email,
    }),
    email: viewer.email,
    image: viewer.settings?.image || viewer.image,
    appPlan: viewer.appPlan,
    settings: viewer.settings,
  };
}
