import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

export function useViewer() {
  const viewer = useQuery(api.users.viewer);

  if (!viewer) return null;

  return {
    id: viewer._id,
    name: viewer.settings?.displayName || viewer.name,
    email: viewer.email,
    image: viewer.settings?.image || viewer.image,
    appPlan: viewer.appPlan,
    settings: viewer.settings,
  };
}
