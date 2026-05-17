import { api } from "@convex/_generated/api";
import type { ChatCoreApiRefs } from "@chat/chat-core";

export const chatCoreApiRefs: ChatCoreApiRefs = {
  projects: {
    listProjects: api.projects.listProjects,
    createProject: api.projects.createProject,
    assignThreadToProject: api.projects.assignThreadToProject,
  },
  agents: {
    listThreadsWithMetadata: api.agents.listThreadsWithMetadata,
    setThreadPinned: api.agents.setThreadPinned,
  },
  chat: {
    deleteThread: api.chat.deleteThread,
  },
};
