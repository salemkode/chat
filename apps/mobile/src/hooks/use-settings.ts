import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useCallback } from "react";

export function useSettings() {
  const settings = useQuery(api.users.getSettings);
  const updateSettingsMutation = useMutation(api.users.updateSettings);

  const updateSettings = useCallback(
    async (values: {
      displayName?: string;
      image?: string;
      bio?: string;
      reasoningEnabled?: boolean;
      reasoningLevel?: "low" | "medium" | "high";
    }) => {
      await updateSettingsMutation(values);
    },
    [updateSettingsMutation],
  );

  return { settings, updateSettings };
}
