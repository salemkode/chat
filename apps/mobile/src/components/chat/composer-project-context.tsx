import { useChatContext } from "@/components/chat/chat-context";
import { useModel } from "@/components/model-context";
import { useComposerToast } from "@/components/composer-toast";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useChatCoreContext, useChatProjects } from "@chat/chat-core";
import {
  buildMentionProjectOptions,
  buildPendingProjectDraft,
  getProjectMention,
  type MentionProjectOption,
  type PendingProjectDraft,
  type ProjectMentionState,
} from "@chat/shared/logic/project-mention";
import { useAction, useQuery } from "convex/react";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Alert } from "react-native";

type ProjectSuggestion = {
  name: string;
  description?: string;
  source: "ai" | "fallback";
  reason?: string;
};

type ComposerProjectContextValue = {
  projectMention: ProjectMentionState | null;
  mentionOptions: MentionProjectOption[];
  highlightedMentionIndex: number;
  setHighlightedMentionIndex: (index: number) => void;
  syncProjectMention: (value: string, caretPosition: number) => void;
  dismissProjectMention: () => void;
  handleMentionSelect: (optionId: string) => void;
  pendingProjectDraft: PendingProjectDraft | null;
  pendingProjectName: string;
  setPendingProjectName: (value: string) => void;
  pendingProjectDescription: string;
  setPendingProjectDescription: (value: string) => void;
  handleConfirmCreateProject: () => void;
  handleCancelCreateProject: () => void;
  creatingProject: boolean;
};

const ComposerProjectContext =
  createContext<ComposerProjectContextValue | null>(null);

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Something went wrong";
}

export function ComposerProjectProvider({
  threadId,
  children,
}: {
  threadId?: string;
  children: ReactNode;
}) {
  const { input, setInput } = useChatContext();
  const { selectedModelId } = useModel();
  const { showComposerToast } = useComposerToast();
  const { projects } = useChatProjects();
  const {
    pendingProjectId,
    setPendingProjectId,
    assignThreadToProject,
    createProject,
  } = useChatCoreContext();
  const suggestProjectFromContext = useAction(
    api.projects.suggestProjectFromContext,
  );
  const threadProject = useQuery(
    api.projects.getProjectForThread,
    threadId ? { threadId } : "skip",
  );

  const [projectMention, setProjectMention] =
    useState<ProjectMentionState | null>(null);
  const [highlightedMentionIndex, setHighlightedMentionIndex] = useState(0);
  const [pendingProjectDraft, setPendingProjectDraft] =
    useState<PendingProjectDraft | null>(null);
  const [pendingProjectName, setPendingProjectName] = useState("");
  const [pendingProjectDescription, setPendingProjectDescription] =
    useState("");
  const [creatingProject, setCreatingProject] = useState(false);
  const caretPositionRef = useRef(input.length);

  const mentionOptions = useMemo(() => {
    if (!projectMention) {
      return [];
    }
    return buildMentionProjectOptions({
      mentionQuery: projectMention.query,
      projects,
      maxProjects: 1,
    }).options;
  }, [projectMention, projects]);

  const syncProjectMention = useCallback((value: string, caretPosition: number) => {
    caretPositionRef.current = caretPosition;
    const nextMention = getProjectMention(value, caretPosition);
    setProjectMention(nextMention);
    if (nextMention) {
      setHighlightedMentionIndex(0);
    }
  }, []);

  const dismissProjectMention = useCallback(() => {
    setProjectMention(null);
  }, []);

  useEffect(() => {
    if (!projectMention) {
      return;
    }
    setHighlightedMentionIndex((current) =>
      mentionOptions.length === 0
        ? 0
        : Math.min(current, mentionOptions.length - 1),
    );
  }, [mentionOptions.length, projectMention]);

  useEffect(() => {
    setPendingProjectDraft(null);
    setCreatingProject(false);
  }, [threadId]);

  useEffect(() => {
    if (!pendingProjectDraft) {
      setPendingProjectName("");
      setPendingProjectDescription("");
      return;
    }
    setPendingProjectName(pendingProjectDraft.name);
    setPendingProjectDescription(pendingProjectDraft.description ?? "");
  }, [pendingProjectDraft?.description, pendingProjectDraft?.name]);

  const applyProjectSelection = useCallback(
    async (projectId: string) => {
      const nextProjectName =
        projects.find((project) => project.id === projectId)?.name ??
        "the selected project";

      if (!threadId) {
        setPendingProjectId(projectId);
        return;
      }

      const currentProjectId = threadProject?.id;
      if (currentProjectId && currentProjectId !== projectId) {
        const currentProjectName =
          threadProject?.name ?? "its current project";
        await new Promise<void>((resolve) => {
          Alert.alert(
            "Move chat?",
            `Move this chat from ${currentProjectName} to ${nextProjectName}?`,
            [
              { text: "Cancel", style: "cancel", onPress: () => resolve() },
              {
                text: "Move",
                onPress: () => {
                  void assignThreadToProject(threadId, projectId)
                    .then(() => resolve())
                    .catch(() => {
                      showComposerToast(
                        "Could not move this chat to the selected project",
                      );
                      resolve();
                    });
                },
              },
            ],
          );
        });
        return;
      }

      try {
        await assignThreadToProject(threadId, projectId);
        setPendingProjectId(null);
      } catch {
        showComposerToast("Could not add this chat to the selected project");
      }
    },
    [
      assignThreadToProject,
      projects,
      setPendingProjectId,
      showComposerToast,
      threadId,
      threadProject?.id,
      threadProject?.name,
    ],
  );

  const handleMentionSelect = useCallback(
    (optionId: string) => {
      if (!projectMention) {
        return;
      }

      const selectedOption = mentionOptions.find((item) => item.id === optionId);
      if (!selectedOption) {
        return;
      }

      const before = input.slice(0, projectMention.start);
      const after = input.slice(projectMention.end);
      const nextValue = `${before}${after}`;
      const nextCaret = before.length;

      setInput(nextValue);
      setProjectMention(null);
      caretPositionRef.current = nextCaret;

      if (selectedOption.kind === "project") {
        setPendingProjectDraft(null);
        void applyProjectSelection(selectedOption.id);
        return;
      }

      setPendingProjectId(null);
      setPendingProjectDraft({
        name: buildPendingProjectDraft({
          mentionQuery: projectMention.query,
          draftWithoutMention: nextValue,
          suggestion: null,
        }).name,
        description: undefined,
        loading: true,
        error: null,
      });

      void (async () => {
        try {
          const suggestion = (await suggestProjectFromContext({
            threadId,
            draft: nextValue,
            modelId: selectedModelId as Id<"models"> | undefined,
            mentionQuery: projectMention.query,
          })) as ProjectSuggestion | undefined;

          setPendingProjectDraft(
            buildPendingProjectDraft({
              mentionQuery: projectMention.query,
              draftWithoutMention: nextValue,
              suggestion,
            }),
          );
        } catch (error) {
          setPendingProjectDraft(
            buildPendingProjectDraft({
              mentionQuery: projectMention.query,
              draftWithoutMention: nextValue,
              errorMessage: getErrorMessage(error),
            }),
          );
        }
      })();
    },
    [
      applyProjectSelection,
      input,
      mentionOptions,
      projectMention,
      selectedModelId,
      setInput,
      setPendingProjectId,
      suggestProjectFromContext,
      threadId,
    ],
  );

  const handleCancelCreateProject = useCallback(() => {
    setPendingProjectDraft(null);
  }, []);

  const handleConfirmCreateProject = useCallback(async () => {
    if (creatingProject || !pendingProjectName.trim()) {
      return;
    }

    setCreatingProject(true);
    try {
      const created = (await createProject({
        name: pendingProjectName.trim(),
        description: pendingProjectDescription.trim() || undefined,
      })) as { id: string } | null;

      const nextProjectId = created?.id;
      if (!nextProjectId) {
        throw new Error("Could not create project right now.");
      }

      if (threadId) {
        const currentProjectId = threadProject?.id;
        if (currentProjectId && currentProjectId !== nextProjectId) {
          const currentProjectName =
            threadProject?.name ?? "its current project";
          await new Promise<void>((resolve, reject) => {
            Alert.alert(
              "Move chat?",
              `Move this chat from ${currentProjectName} to ${pendingProjectName.trim()}?`,
              [
                {
                  text: "Cancel",
                  style: "cancel",
                  onPress: () => {
                    setPendingProjectDraft(null);
                    resolve();
                  },
                },
                {
                  text: "Move",
                  onPress: () => {
                    void assignThreadToProject(threadId, nextProjectId)
                      .then(() => resolve())
                      .catch(() => {
                        showComposerToast(
                          "Could not move this chat to the new project",
                        );
                        reject(new Error("assign failed"));
                      });
                  },
                },
              ],
            );
          });
        } else {
          await assignThreadToProject(threadId, nextProjectId);
        }
        setPendingProjectId(null);
      } else {
        setPendingProjectId(nextProjectId);
      }

      setPendingProjectDraft(null);
    } catch (error) {
      const message = getErrorMessage(error);
      setPendingProjectDraft((current) =>
        current
          ? {
              ...current,
              loading: false,
              error: message,
            }
          : current,
      );
    } finally {
      setCreatingProject(false);
    }
  }, [
    assignThreadToProject,
    createProject,
    creatingProject,
    pendingProjectDescription,
    pendingProjectName,
    setPendingProjectId,
    showComposerToast,
    threadId,
    threadProject?.id,
    threadProject?.name,
  ]);

  const value = useMemo<ComposerProjectContextValue>(
    () => ({
      projectMention,
      mentionOptions,
      highlightedMentionIndex,
      setHighlightedMentionIndex,
      syncProjectMention,
      dismissProjectMention,
      handleMentionSelect,
      pendingProjectDraft,
      pendingProjectName,
      setPendingProjectName,
      pendingProjectDescription,
      setPendingProjectDescription,
      handleConfirmCreateProject,
      handleCancelCreateProject,
      creatingProject,
    }),
    [
      creatingProject,
      dismissProjectMention,
      handleCancelCreateProject,
      handleConfirmCreateProject,
      handleMentionSelect,
      highlightedMentionIndex,
      mentionOptions,
      pendingProjectDescription,
      pendingProjectDraft,
      pendingProjectName,
      projectMention,
      syncProjectMention,
    ],
  );

  return (
    <ComposerProjectContext value={value}>{children}</ComposerProjectContext>
  );
}

export function useComposerProject() {
  const context = use(ComposerProjectContext);
  if (!context) {
    throw new Error(
      "useComposerProject must be used within <ComposerProjectProvider>",
    );
  }
  return context;
}
