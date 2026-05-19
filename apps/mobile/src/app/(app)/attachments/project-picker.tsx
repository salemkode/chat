import { ProjectPickerContent } from "@/components/dialog/project-picker-content";
import { useComposerToast } from "@/components/composer-toast";
import { api } from "@convex/_generated/api";
import { useChatCoreContext, useChatProjects } from "@chat/chat-core";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useCallback, useMemo } from "react";
import { useSelector } from "@legendapp/state/react";
import { threadSelection$ } from "@/state/thread-selection";

export default function ProjectPickerSheet() {
  const router = useRouter();
  const { showComposerToast } = useComposerToast();
  const { projects } = useChatProjects();
  const { pendingProjectId, setPendingProjectId, assignThreadToProject } =
    useChatCoreContext();
  const threadId = useSelector(() => threadSelection$.selectedThreadId.get());
  const threadProject = useQuery(
    api.projects.getProjectForThread,
    threadId ? { threadId } : "skip",
  );
  const removeThreadFromProject = useMutation(
    api.projects.removeThreadFromProject,
  );

  const selectedProjectId = useMemo(() => {
    if (threadId) {
      if (threadProject === undefined) {
        return pendingProjectId;
      }
      return threadProject?.id ?? null;
    }
    return pendingProjectId;
  }, [pendingProjectId, threadId, threadProject]);

  const onSelectProject = useCallback(
    async (projectId: string | null) => {
      try {
        if (threadId) {
          if (projectId) {
            await assignThreadToProject(threadId, projectId);
          } else {
            await removeThreadFromProject({ threadId });
          }
          setPendingProjectId(null);
        } else {
          setPendingProjectId(projectId);
        }
        router.back();
      } catch {
        showComposerToast("Could not update project for this chat");
      }
    },
    [
      assignThreadToProject,
      removeThreadFromProject,
      router,
      setPendingProjectId,
      showComposerToast,
      threadId,
    ],
  );

  return (
    <ProjectPickerContent
      projects={projects}
      selectedProjectId={selectedProjectId}
      onSelectProject={(projectId) => {
        void onSelectProject(projectId);
      }}
    />
  );
}
