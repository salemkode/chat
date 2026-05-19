/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";
import type { GenericId as Id } from "convex/values";

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: {
  admin: {
    addModel: FunctionReference<
      "mutation",
      "public",
      {
        capabilities?: Array<string>;
        contextWindow?: number;
        defaultReasoningLevel?: "off" | "low" | "medium" | "high";
        description?: string;
        displayName: string;
        icon?: string;
        iconId?: Id<"_storage">;
        iconType?: "emoji" | "lucide" | "phosphor" | "upload";
        isEnabled: boolean;
        isFree: boolean;
        maxOutputTokens?: number;
        modalities?: { input: Array<string>; output: Array<string> };
        modelId: string;
        ownedBy?: string;
        providerId: Id<"providers">;
        rateLimit?: {
          capacity?: number;
          enabled: boolean;
          kind: "fixed window" | "token bucket";
          period: number;
          rate: number;
          scope: "global" | "user";
          shards?: number;
        };
        reasoningLevels?: Array<"low" | "medium" | "high">;
        sortOrder: number;
        supportedAttachmentMediaTypes?: Array<string>;
        supportsReasoning?: boolean;
      },
      any
    >;
    addModelCollection: FunctionReference<
      "mutation",
      "public",
      {
        description?: string;
        modelIds: Array<Id<"models">>;
        name: string;
        sortOrder: number;
      },
      any
    >;
    addProvider: FunctionReference<
      "mutation",
      "public",
      {
        apiKey: string;
        baseURL?: string;
        config?: {
          headers?: Record<string, string>;
          organization?: string;
          project?: string;
          queryParams?: Record<string, string>;
        };
        description?: string;
        icon?: string;
        iconId?: Id<"_storage">;
        iconType?: "emoji" | "lucide" | "phosphor" | "upload";
        isEnabled: boolean;
        name: string;
        providerType:
          | "openrouter"
          | "openai"
          | "anthropic"
          | "google"
          | "azure"
          | "groq"
          | "deepseek"
          | "xai"
          | "cerebras"
          | "openai-compatible"
          | "opencode"
          | "mistral"
          | "cohere"
          | "perplexity"
          | "fireworks"
          | "together"
          | "replicate"
          | "moonshot"
          | "qwen"
          | "stepfun";
        rateLimit?: {
          capacity?: number;
          enabled: boolean;
          kind: "fixed window" | "token bucket";
          period: number;
          rate: number;
          scope: "global" | "user";
          shards?: number;
        };
        sortOrder: number;
      },
      any
    >;
    createModelOffer: FunctionReference<
      "mutation",
      "public",
      {
        description?: string;
        endsAt: number;
        isEnabled?: boolean;
        kind: "free_access" | "availability_window";
        label?: string;
        modelId: Id<"models">;
        startsAt: number;
      },
      Id<"modelOffers">
    >;
    deleteModel: FunctionReference<
      "mutation",
      "public",
      { id: Id<"models"> },
      any
    >;
    deleteModelCollection: FunctionReference<
      "mutation",
      "public",
      { id: Id<"modelCollections"> },
      any
    >;
    deleteModelOffer: FunctionReference<
      "mutation",
      "public",
      { offerId: Id<"modelOffers"> },
      null
    >;
    deleteProvider: FunctionReference<
      "mutation",
      "public",
      { id: Id<"providers"> },
      any
    >;
    generateUploadUrl: FunctionReference<"mutation", "public", {}, any>;
    getAdminSettings: FunctionReference<"query", "public", {}, any>;
    getDashboardData: FunctionReference<"query", "public", {}, any>;
    getRoleContext: FunctionReference<
      "query",
      "public",
      {},
      { isAdminLike: boolean; role: "owner" | "admin" | "member" }
    >;
    importDiscoveredModels: FunctionReference<
      "mutation",
      "public",
      {
        enableImportedModels?: boolean;
        models: Array<{
          contextWindow?: number;
          description?: string;
          displayName: string;
          maxOutputTokens?: number;
          modalities?: { input: Array<string>; output: Array<string> };
          modelId: string;
          ownedBy?: string;
        }>;
        providerId: Id<"providers">;
      },
      any
    >;
    inspectProviderCatalog: FunctionReference<
      "action",
      "public",
      {
        apiKey: string;
        baseURL?: string;
        config?: {
          headers?: Record<string, string>;
          organization?: string;
          project?: string;
          queryParams?: Record<string, string>;
        };
        providerId?: Id<"providers">;
        providerType:
          | "openrouter"
          | "openai"
          | "anthropic"
          | "google"
          | "azure"
          | "groq"
          | "deepseek"
          | "xai"
          | "cerebras"
          | "openai-compatible"
          | "opencode"
          | "mistral"
          | "cohere"
          | "perplexity"
          | "fireworks"
          | "together"
          | "replicate"
          | "moonshot"
          | "qwen"
          | "stepfun";
      },
      any
    >;
    isAdmin: FunctionReference<"query", "public", {}, boolean>;
    listAllModels: FunctionReference<"query", "public", {}, any>;
    listAllProviders: FunctionReference<"query", "public", {}, any>;
    listEnabledModels: FunctionReference<
      "query",
      "public",
      {},
      Array<{
        _creationTime: number;
        _id: Id<"models">;
        attachmentValidatedAt?: number;
        attachmentValidationMessage?: string;
        attachmentValidationStatus?: "pending" | "valid" | "invalid";
        capabilities?: Array<string>;
        contextWindow?: number;
        defaultReasoningLevel?: "off" | "low" | "medium" | "high";
        description?: string;
        discoveredAt?: number;
        displayName: string;
        icon?: string;
        iconId?: Id<"_storage">;
        iconType?: "emoji" | "lucide" | "phosphor" | "upload";
        isEnabled: boolean;
        isFree: boolean;
        lastSyncedAt?: number;
        maxOutputTokens?: number;
        modalities?: { input: Array<string>; output: Array<string> };
        modelId: string;
        ownedBy?: string;
        providerId: Id<"providers">;
        rateLimit?: {
          capacity?: number;
          enabled: boolean;
          kind: "fixed window" | "token bucket";
          period: number;
          rate: number;
          scope: "global" | "user";
          shards?: number;
        };
        reasoningLevels?: Array<"low" | "medium" | "high">;
        sortOrder: number;
        supportedAttachmentMediaTypes?: Array<string>;
        supportsReasoning?: boolean;
      }>
    >;
    listModelOffers: FunctionReference<
      "query",
      "public",
      {},
      Array<{
        _creationTime: number;
        _id: Id<"modelOffers">;
        description?: string;
        endsAt: number;
        isEnabled: boolean;
        kind: "free_access" | "availability_window";
        label?: string;
        modelId: Id<"models">;
        startsAt: number;
        updatedAt: number;
      }>
    >;
    listModelsWithProviders: FunctionReference<
      "query",
      "public",
      {},
      {
        autoModelAvailable: boolean;
        collections: Array<{
          _creationTime: number;
          _id: Id<"modelCollections">;
          description?: string;
          modelCount: number;
          modelIds: Array<Id<"models">>;
          name: string;
          sortOrder: number;
        }>;
        favorites: Array<{
          _creationTime: number;
          _id: Id<"models">;
          attachmentValidatedAt?: number;
          attachmentValidationMessage?: string;
          attachmentValidationStatus?: "pending" | "valid" | "invalid";
          capabilities?: Array<string>;
          contextWindow?: number;
          defaultReasoningLevel?: "off" | "low" | "medium" | "high";
          description?: string;
          discoveredAt?: number;
          displayName: string;
          icon?: string;
          iconId?: Id<"_storage">;
          iconType?: "emoji" | "lucide" | "phosphor" | "upload";
          iconUrl?: string;
          isEnabled: boolean;
          isFavorite: boolean;
          isFree: boolean;
          lastSyncedAt?: number;
          maxOutputTokens?: number;
          modalities?: { input: Array<string>; output: Array<string> };
          modelId: string;
          ownedBy?: string;
          provider: null | {
            _id: Id<"providers">;
            icon?: string;
            iconId?: Id<"_storage">;
            iconType?: "emoji" | "lucide" | "phosphor" | "upload";
            iconUrl?: string;
            name: string;
            providerType:
              | "openrouter"
              | "openai"
              | "anthropic"
              | "google"
              | "azure"
              | "groq"
              | "deepseek"
              | "xai"
              | "cerebras"
              | "openai-compatible"
              | "opencode"
              | "mistral"
              | "cohere"
              | "perplexity"
              | "fireworks"
              | "together"
              | "replicate"
              | "moonshot"
              | "qwen"
              | "stepfun";
          };
          providerId: Id<"providers">;
          rateLimit?: {
            capacity?: number;
            enabled: boolean;
            kind: "fixed window" | "token bucket";
            period: number;
            rate: number;
            scope: "global" | "user";
            shards?: number;
          };
          reasoningLevels?: Array<"low" | "medium" | "high">;
          sortOrder: number;
          supportedAttachmentMediaTypes?: Array<string>;
          supportsReasoning?: boolean;
        }>;
        models: Array<{
          _creationTime: number;
          _id: Id<"models">;
          attachmentValidatedAt?: number;
          attachmentValidationMessage?: string;
          attachmentValidationStatus?: "pending" | "valid" | "invalid";
          capabilities?: Array<string>;
          contextWindow?: number;
          defaultReasoningLevel?: "off" | "low" | "medium" | "high";
          description?: string;
          discoveredAt?: number;
          displayName: string;
          icon?: string;
          iconId?: Id<"_storage">;
          iconType?: "emoji" | "lucide" | "phosphor" | "upload";
          iconUrl?: string;
          isEnabled: boolean;
          isFavorite: boolean;
          isFree: boolean;
          lastSyncedAt?: number;
          maxOutputTokens?: number;
          modalities?: { input: Array<string>; output: Array<string> };
          modelId: string;
          ownedBy?: string;
          provider: null | {
            _id: Id<"providers">;
            icon?: string;
            iconId?: Id<"_storage">;
            iconType?: "emoji" | "lucide" | "phosphor" | "upload";
            iconUrl?: string;
            name: string;
            providerType:
              | "openrouter"
              | "openai"
              | "anthropic"
              | "google"
              | "azure"
              | "groq"
              | "deepseek"
              | "xai"
              | "cerebras"
              | "openai-compatible"
              | "opencode"
              | "mistral"
              | "cohere"
              | "perplexity"
              | "fireworks"
              | "together"
              | "replicate"
              | "moonshot"
              | "qwen"
              | "stepfun";
          };
          providerId: Id<"providers">;
          rateLimit?: {
            capacity?: number;
            enabled: boolean;
            kind: "fixed window" | "token bucket";
            period: number;
            rate: number;
            scope: "global" | "user";
            shards?: number;
          };
          reasoningLevels?: Array<"low" | "medium" | "high">;
          sortOrder: number;
          supportedAttachmentMediaTypes?: Array<string>;
          supportsReasoning?: boolean;
        }>;
        providers: Array<{
          _id: Id<"providers">;
          icon?: string;
          iconId?: Id<"_storage">;
          iconType?: "emoji" | "lucide" | "phosphor" | "upload";
          iconUrl?: string;
          name: string;
          providerType:
            | "openrouter"
            | "openai"
            | "anthropic"
            | "google"
            | "azure"
            | "groq"
            | "deepseek"
            | "xai"
            | "cerebras"
            | "openai-compatible"
            | "opencode"
            | "mistral"
            | "cohere"
            | "perplexity"
            | "fireworks"
            | "together"
            | "replicate"
            | "moonshot"
            | "qwen"
            | "stepfun";
        }>;
      }
    >;
    makeAdmin: FunctionReference<
      "mutation",
      "public",
      { userId: Id<"users"> },
      any
    >;
    searchUsersForAdmin: FunctionReference<
      "query",
      "public",
      { limit?: number; query: string },
      any
    >;
    seedModels: FunctionReference<"mutation", "public", {}, any>;
    setFavoriteModel: FunctionReference<
      "mutation",
      "public",
      { clientUpdatedAt?: number; isFavorite: boolean; modelId: Id<"models"> },
      any
    >;
    setUserAppPlan: FunctionReference<
      "mutation",
      "public",
      { appPlan: "free" | "pro"; userId: Id<"users"> },
      any
    >;
    setUserRole: FunctionReference<
      "mutation",
      "public",
      { role: "owner" | "admin" | "member"; userId: Id<"users"> },
      any
    >;
    toggleFavoriteModel: FunctionReference<
      "mutation",
      "public",
      { modelId: Id<"models"> },
      any
    >;
    toggleModelEnabled: FunctionReference<
      "mutation",
      "public",
      { id: Id<"models">; isEnabled: boolean },
      any
    >;
    toggleProviderEnabled: FunctionReference<
      "mutation",
      "public",
      { id: Id<"providers">; isEnabled: boolean },
      any
    >;
    updateAdminSettings: FunctionReference<
      "mutation",
      "public",
      {
        appPlan?: "free" | "pro";
        autoModelRouterApiKey?: string;
        autoModelRouterPreference?: "balanced" | "cost" | "speed" | "quality";
        autoModelRouterUrl?: string;
        autoModelRoutingEnabled?: boolean;
        defaultRateLimit?: {
          capacity?: number;
          enabled: boolean;
          kind: "fixed window" | "token bucket";
          period: number;
          rate: number;
          scope: "global" | "user";
          shards?: number;
        };
      },
      any
    >;
    updateModel: FunctionReference<
      "mutation",
      "public",
      {
        capabilities?: Array<string>;
        contextWindow?: number;
        defaultReasoningLevel?: "off" | "low" | "medium" | "high";
        description?: string;
        displayName?: string;
        icon?: string;
        iconId?: Id<"_storage">;
        iconType?: "emoji" | "lucide" | "phosphor" | "upload";
        id: Id<"models">;
        isEnabled?: boolean;
        isFree?: boolean;
        maxOutputTokens?: number;
        modalities?: { input: Array<string>; output: Array<string> };
        modelId?: string;
        ownedBy?: string;
        providerId?: Id<"providers">;
        rateLimit?: {
          capacity?: number;
          enabled: boolean;
          kind: "fixed window" | "token bucket";
          period: number;
          rate: number;
          scope: "global" | "user";
          shards?: number;
        };
        reasoningLevels?: Array<"low" | "medium" | "high">;
        sortOrder?: number;
        supportedAttachmentMediaTypes?: Array<string>;
        supportsReasoning?: boolean;
      },
      any
    >;
    updateModelCollection: FunctionReference<
      "mutation",
      "public",
      {
        description?: string;
        id: Id<"modelCollections">;
        modelIds?: Array<Id<"models">>;
        name?: string;
        sortOrder?: number;
      },
      any
    >;
    updateModelOffer: FunctionReference<
      "mutation",
      "public",
      {
        description?: string;
        endsAt?: number;
        isEnabled?: boolean;
        kind?: "free_access" | "availability_window";
        label?: string;
        offerId: Id<"modelOffers">;
        startsAt?: number;
      },
      null
    >;
    updateProvider: FunctionReference<
      "mutation",
      "public",
      {
        apiKey?: string;
        baseURL?: string;
        config?: {
          headers?: Record<string, string>;
          organization?: string;
          project?: string;
          queryParams?: Record<string, string>;
        };
        description?: string;
        icon?: string;
        iconId?: Id<"_storage">;
        iconType?: "emoji" | "lucide" | "phosphor" | "upload";
        id: Id<"providers">;
        isEnabled?: boolean;
        name?: string;
        providerType?:
          | "openrouter"
          | "openai"
          | "anthropic"
          | "google"
          | "azure"
          | "groq"
          | "deepseek"
          | "xai"
          | "cerebras"
          | "openai-compatible"
          | "opencode"
          | "mistral"
          | "cohere"
          | "perplexity"
          | "fireworks"
          | "together"
          | "replicate"
          | "moonshot"
          | "qwen"
          | "stepfun";
        rateLimit?: {
          capacity?: number;
          enabled: boolean;
          kind: "fixed window" | "token bucket";
          period: number;
          rate: number;
          scope: "global" | "user";
          shards?: number;
        };
        sortOrder?: number;
      },
      any
    >;
    validateModelAttachmentPolicies: FunctionReference<
      "mutation",
      "public",
      { modelId?: Id<"models"> },
      { invalidCount: number; updatedAt: number; validatedCount: number }
    >;
    verifyAutoModelRouterConnection: FunctionReference<
      "action",
      "public",
      { routerApiKey?: string; routerUrl?: string },
      {
        authenticated: boolean;
        contractMatched: boolean;
        expectedContract: string;
        healthStatus?: string;
        message: string;
        ok: boolean;
        reachable: boolean;
      }
    >;
  };
  agents: {
    createChatThread: FunctionReference<
      "mutation",
      "public",
      {
        clientThreadKey?: string;
        projectId?: Id<"projects">;
        sectionId?: Id<"sections">;
        title?: string;
      },
      string
    >;
    generateAttachmentUploadUrl: FunctionReference<
      "mutation",
      "public",
      {},
      any
    >;
    generateMessage: FunctionReference<
      "mutation",
      "public",
      {
        attachments?: Array<{
          filename?: string;
          mediaType?: string;
          storageId: Id<"_storage">;
        }>;
        clientRequestId?: string;
        contextArtifactIds?: Array<Id<"projectArtifacts">>;
        modelId: Id<"models">;
        projectId?: Id<"projects">;
        prompt: string;
        reasoning?: { enabled: boolean; level?: "low" | "medium" | "high" };
        routerDecisionId?: string;
        searchEnabled?: boolean;
        searchMode?: "auto" | "required";
        threadId: string;
      },
      any
    >;
    getThreadContextMeter: FunctionReference<
      "query",
      "public",
      { selectedModelId: Id<"models">; threadId: string },
      {
        contextWindow: number | null;
        hasUsage: boolean;
        modelMatches: boolean;
        usedPromptTokens: number | null;
      }
    >;
    listThreadsWithMetadata: FunctionReference<
      "query",
      "public",
      {},
      Array<{
        _creationTime: number;
        _id: string;
        lastMessageAt: number;
        metadata: null | {
          _creationTime: number;
          _id: Id<"threadMetadata">;
          clientThreadKey?: string;
          emoji: string;
          icon?: string;
          lastLabelUpdateAt: number;
          lastMessageAt?: number;
          projectId?: Id<"projects">;
          sectionId?: Id<"sections">;
          sortOrder: number;
          threadId: string;
          userId: Id<"users">;
        };
        project: null | { description?: string; id: string; name: string };
        title?: string;
        userId?: string;
      }>
    >;
    listVisibleThreadLastMessages: FunctionReference<
      "query",
      "public",
      { threadIds: Array<string> },
      Array<{
        createdAt: number;
        messageId: string;
        role: "user" | "assistant";
        text: string;
        threadId: string;
      }>
    >;
    regenerateMessage: FunctionReference<
      "mutation",
      "public",
      {
        clientRequestId?: string;
        contextArtifactIds?: Array<Id<"projectArtifacts">>;
        modelId: Id<"models">;
        projectId?: Id<"projects">;
        promptMessageId: string;
        reasoning?: { enabled: boolean; level?: "low" | "medium" | "high" };
        routerDecisionId?: string;
        searchEnabled?: boolean;
        searchMode?: "auto" | "required";
        threadId: string;
      },
      null
    >;
    resolveThreadIdByClientKey: FunctionReference<
      "query",
      "public",
      { clientThreadKey: string },
      string | null
    >;
    setThreadPinned: FunctionReference<
      "mutation",
      "public",
      { pinned: boolean; threadId: string },
      number
    >;
    stopGeneration: FunctionReference<
      "mutation",
      "public",
      { promptMessageId?: string; threadId: string },
      { order?: number; stopped: boolean }
    >;
    togglePinThread: FunctionReference<
      "mutation",
      "public",
      { threadId: string },
      number
    >;
    updateThreadIcon: FunctionReference<
      "mutation",
      "public",
      { icon: string; threadId: string },
      string
    >;
    updateThreadSection: FunctionReference<
      "mutation",
      "public",
      { sectionId?: Id<"sections">; threadId: string },
      null
    >;
    updateThreadTitle: FunctionReference<
      "mutation",
      "public",
      { threadId: string; title: string },
      string
    >;
  };
  chat: {
    createThread: FunctionReference<"mutation", "public", {}, any>;
    deleteThread: FunctionReference<
      "mutation",
      "public",
      { threadId: string },
      any
    >;
    getThread: FunctionReference<"query", "public", { threadId: string }, any>;
    listMessages: FunctionReference<
      "query",
      "public",
      {
        paginationOpts: {
          cursor: string | null;
          endCursor?: string | null;
          id?: number;
          maximumBytesRead?: number;
          maximumRowsRead?: number;
          numItems: number;
        };
        streamArgs?:
          | { kind: "list"; startOrder?: number }
          | {
              cursors: Array<{ cursor: number; streamId: string }>;
              kind: "deltas";
            };
        threadId: string;
      },
      any
    >;
    listThreads: FunctionReference<
      "query",
      "public",
      {
        paginationOpts: {
          cursor: string | null;
          endCursor?: string | null;
          id?: number;
          maximumBytesRead?: number;
          maximumRowsRead?: number;
          numItems: number;
        };
      },
      any
    >;
  };
  functions: {
    admin: {
      getMemoryStats: FunctionReference<
        "query",
        "public",
        {},
        { cacheEntries: number; chunks: number; files: number }
      >;
      syncMemory: FunctionReference<
        "mutation",
        "public",
        {},
        { message: string; success: boolean }
      >;
    };
    memory: {
      addThreadToProject: FunctionReference<
        "mutation",
        "public",
        { projectId: Id<"projects">; threadId: string },
        { success: boolean }
      >;
      createProject: FunctionReference<
        "mutation",
        "public",
        { description?: string; name: string },
        { projectId: string }
      >;
      createProjectMemory: FunctionReference<
        "action",
        "public",
        {
          category?: string;
          content: string;
          projectId: Id<"projects">;
          tags?: Array<string>;
          title: string;
        },
        {
          category?: string;
          content: string;
          createdAt: number;
          memoryId: string;
          originMessageIds?: Array<string>;
          originThreadId?: string;
          projectId?: string;
          scope: "user" | "thread" | "project";
          source: string;
          tags?: Array<string>;
          threadId?: string;
          title: string;
          updatedAt: number;
          userId: string;
        }
      >;
      createThreadMemory: FunctionReference<
        "action",
        "public",
        {
          category?: string;
          content: string;
          tags?: Array<string>;
          threadId: string;
          title: string;
        },
        {
          category?: string;
          content: string;
          createdAt: number;
          memoryId: string;
          originMessageIds?: Array<string>;
          originThreadId?: string;
          projectId?: string;
          scope: "user" | "thread" | "project";
          source: string;
          tags?: Array<string>;
          threadId?: string;
          title: string;
          updatedAt: number;
          userId: string;
        }
      >;
      createUserMemory: FunctionReference<
        "action",
        "public",
        {
          category?: string;
          content: string;
          tags?: Array<string>;
          title: string;
        },
        {
          category?: string;
          content: string;
          createdAt: number;
          memoryId: string;
          originMessageIds?: Array<string>;
          originThreadId?: string;
          projectId?: string;
          scope: "user" | "thread" | "project";
          source: string;
          tags?: Array<string>;
          threadId?: string;
          title: string;
          updatedAt: number;
          userId: string;
        }
      >;
      deleteMemory: FunctionReference<
        "action",
        "public",
        {
          projectMemoryId?: Id<"projectMemories">;
          scope: "user" | "thread" | "project";
          threadMemoryId?: Id<"threadMemories">;
          userMemoryId?: Id<"userMemories">;
        },
        { success: boolean }
      >;
      getProjectById: FunctionReference<
        "query",
        "public",
        { projectId: Id<"projects"> },
        null | {
          _creationTime: number;
          _id: Id<"projects">;
          createdAt: number;
          description?: string;
          name: string;
          ownerUserId: Id<"users">;
          threadIds?: Array<string>;
          updatedAt: number;
          userId?: Id<"users">;
          visibility: "private" | "shared";
        }
      >;
      listProjectMemories: FunctionReference<
        "query",
        "public",
        {
          category?: string;
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          projectId?: Id<"projects">;
          query?: string;
          source?: "manual" | "extracted";
          tags?: Array<string>;
        },
        {
          continueCursor: null | string;
          isDone: boolean;
          page: Array<{
            category?: string;
            content: string;
            createdAt: number;
            memoryId: string;
            originMessageIds?: Array<string>;
            originThreadId?: string;
            projectId?: string;
            scope: "user" | "thread" | "project";
            source: string;
            tags?: Array<string>;
            threadId?: string;
            title: string;
            updatedAt: number;
            userId: string;
          }>;
          total: number;
        }
      >;
      listProjects: FunctionReference<
        "query",
        "public",
        {},
        Array<{
          createdAt: number;
          description?: string;
          id: string;
          name: string;
          threadIds: Array<string>;
          updatedAt: number;
        }>
      >;
      listThreadMemories: FunctionReference<
        "query",
        "public",
        {
          category?: string;
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          query?: string;
          source?: "manual" | "extracted";
          tags?: Array<string>;
          threadId?: string;
        },
        {
          continueCursor: null | string;
          isDone: boolean;
          page: Array<{
            category?: string;
            content: string;
            createdAt: number;
            memoryId: string;
            originMessageIds?: Array<string>;
            originThreadId?: string;
            projectId?: string;
            scope: "user" | "thread" | "project";
            source: string;
            tags?: Array<string>;
            threadId?: string;
            title: string;
            updatedAt: number;
            userId: string;
          }>;
          total: number;
        }
      >;
      listUserMemories: FunctionReference<
        "query",
        "public",
        {
          category?: string;
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          query?: string;
          source?: "manual" | "extracted" | "system";
          tags?: Array<string>;
        },
        {
          continueCursor: null | string;
          isDone: boolean;
          page: Array<{
            category?: string;
            content: string;
            createdAt: number;
            memoryId: string;
            originMessageIds?: Array<string>;
            originThreadId?: string;
            projectId?: string;
            scope: "user" | "thread" | "project";
            source: string;
            tags?: Array<string>;
            threadId?: string;
            title: string;
            updatedAt: number;
            userId: string;
          }>;
          total: number;
        }
      >;
      searchMemory: FunctionReference<
        "action",
        "public",
        {
          categories?: Array<string>;
          maxResults?: number;
          minScore?: number;
          projectId?: Id<"projects">;
          query: string;
          scope?: "user" | "thread" | "project" | "all";
          threadId?: string;
        },
        {
          hits: Array<{
            category?: string;
            content: string;
            createdAt: number;
            memoryId: string;
            originMessageIds?: Array<string>;
            originThreadId?: string;
            projectId?: string;
            rank: number;
            scope: "user" | "thread" | "project";
            score?: number;
            source: string;
            tags?: Array<string>;
            threadId?: string;
            title: string;
            updatedAt: number;
            userId: string;
          }>;
          text: string;
        }
      >;
      updateMemory: FunctionReference<
        "action",
        "public",
        {
          category?: string;
          content?: string;
          projectMemoryId?: Id<"projectMemories">;
          scope: "user" | "thread" | "project";
          tags?: Array<string>;
          threadMemoryId?: Id<"threadMemories">;
          title?: string;
          userMemoryId?: Id<"userMemories">;
        },
        {
          category?: string;
          content: string;
          createdAt: number;
          memoryId: string;
          originMessageIds?: Array<string>;
          originThreadId?: string;
          projectId?: string;
          scope: "user" | "thread" | "project";
          source: string;
          tags?: Array<string>;
          threadId?: string;
          title: string;
          updatedAt: number;
          userId: string;
        }
      >;
    };
    memoryCache: {
      cacheEmbedding: FunctionReference<
        "mutation",
        "public",
        {
          dims?: number;
          embedding: Array<number>;
          hash: string;
          model: string;
          provider: string;
          providerKey: string;
        },
        any
      >;
      getCachedEmbedding: FunctionReference<
        "query",
        "public",
        { hash: string; model: string; provider: string; providerKey: string },
        any
      >;
      getCacheStats: FunctionReference<"query", "public", any, any>;
      pruneOldCache: FunctionReference<
        "mutation",
        "public",
        { maxEntries?: number },
        any
      >;
    };
    memorySearch: {
      searchFiles: FunctionReference<
        "query",
        "public",
        {
          agentId: string;
          pathPattern?: string;
          source?: "memory" | "sessions";
        },
        Array<{
          hash: string;
          id: string;
          mtime: number;
          path: string;
          size: number;
          source: "memory" | "sessions";
        }>
      >;
      vectorSearchChunks: FunctionReference<
        "action",
        "public",
        {
          agentId: string;
          maxResults?: number;
          minScore?: number;
          query: string;
          source?: "memory" | "sessions";
        },
        Array<{
          endLine: number;
          id: string;
          path: string;
          score: number;
          snippet: string;
          source: "memory" | "sessions";
          startLine: number;
        }>
      >;
    };
    memorySync: {
      deleteFile: FunctionReference<
        "mutation",
        "public",
        { agentId: string; path: string },
        any
      >;
      getFile: FunctionReference<
        "query",
        "public",
        { agentId: string; path: string },
        any
      >;
      getSyncStatus: FunctionReference<
        "query",
        "public",
        { agentId: string },
        any
      >;
      listFiles: FunctionReference<
        "query",
        "public",
        { agentId: string; source?: "memory" | "sessions" },
        any
      >;
      syncFile: FunctionReference<
        "mutation",
        "public",
        {
          agentId: string;
          chunks: Array<{
            embedding: Array<number>;
            endLine: number;
            hash: string;
            startLine: number;
            text: string;
          }>;
          hash: string;
          mtime: number;
          path: string;
          size: number;
          source: "memory" | "sessions";
        },
        any
      >;
      updateSyncStatus: FunctionReference<
        "mutation",
        "public",
        {
          agentId: string;
          dirty?: boolean;
          error?: string;
          lastFullSync?: number;
          pendingFiles?: Array<string>;
        },
        any
      >;
    };
    projectRetrieval: {
      getProjectArtifact: FunctionReference<
        "action",
        "public",
        { artifactId: Id<"projectArtifacts">; projectId: Id<"projects"> },
        null | {
          content?: string;
          id: string;
          includeInContext: boolean;
          kind: string;
          pinned: boolean;
          provider: string;
          title: string;
          url?: string;
        }
      >;
      searchProjectArtifactsForMention: FunctionReference<
        "query",
        "public",
        { maxResults?: number; projectId: Id<"projects">; query: string },
        Array<{
          id: string;
          kind: string;
          provider: string;
          subtitle?: string;
          title: string;
          url?: string;
        }>
      >;
    };
  };
  integrations: {
    disconnectConnection: FunctionReference<
      "mutation",
      "public",
      { connectionId: Id<"integrationConnections"> },
      null
    >;
    getOAuthStartUrl: FunctionReference<
      "mutation",
      "public",
      {
        projectId?: Id<"projects">;
        provider: "github" | "google";
        redirectTo?: string;
      },
      { provider: "github" | "google"; url: string }
    >;
    listConnections: FunctionReference<
      "query",
      "public",
      {},
      Array<{
        accountLabel: string;
        accountSubject: string;
        createdAt: number;
        expiresAt?: number;
        id: string;
        lastError?: string;
        lastSyncAt?: number;
        lastValidatedAt?: number;
        provider: "github" | "google";
        scopes: Array<string>;
        status: "active" | "expired" | "revoked" | "error";
        updatedAt: number;
      }>
    >;
    validateConnection: FunctionReference<
      "mutation",
      "public",
      { connectionId: Id<"integrationConnections"> },
      {
        hasAccessToken: boolean;
        status: "active" | "expired" | "revoked" | "error";
      }
    >;
  };
  messages: {
    list: FunctionReference<"query", "public", {}, any>;
    send: FunctionReference<
      "mutation",
      "public",
      { body: string; role: "user" | "assistant" },
      any
    >;
  };
  modelRouter: {
    selectAutoModel: FunctionReference<
      "action",
      "public",
      {
        attachmentSummary?: {
          fileCount: number;
          imageCount: number;
          totalCount: number;
        };
        prompt: string;
        reasoningEnabled?: boolean;
        requiresImageInput?: boolean;
        searchEnabled?: boolean;
        threadId?: string;
      },
      {
        decisionId: string;
        selectedModelDocId: Id<"models">;
        selectedModelId: string;
        selectedModelName: string;
        selectedProviderName: string;
      }
    >;
    selectAutoModelForPromptMessage: FunctionReference<
      "action",
      "public",
      {
        promptMessageId: string;
        reasoningEnabled?: boolean;
        requiresImageInput?: boolean;
        searchEnabled?: boolean;
        threadId: string;
      },
      {
        decisionId: string;
        selectedModelDocId: Id<"models">;
        selectedModelId: string;
        selectedModelName: string;
        selectedProviderName: string;
      }
    >;
  };
  modelSelection: {
    ingestTrainingExamples: FunctionReference<
      "mutation",
      "public",
      {
        examples: Array<{
          costLabel?: number;
          latencyLabel?: number;
          metadata?: Record<string, string>;
          promptHash: string;
          promptPreview?: string;
          qualityLabel?: number;
          source: "benchmark" | "production" | "synthetic";
          split?: "train" | "validation" | "test";
          successLabel?: boolean;
          targetModelId?: Id<"models">;
          targetResponse?: string;
          taskType: "chat" | "coding" | "analysis" | "rewrite" | "qa";
          tier?: "free" | "pro" | "advanced" | "light" | "medium";
        }>;
      },
      { inserted: number }
    >;
    listRoutingPolicies: FunctionReference<
      "query",
      "public",
      { tier?: "free" | "pro" | "advanced" | "light" | "medium" },
      any
    >;
    reportOutcome: FunctionReference<
      "mutation",
      "public",
      {
        actualCost?: number;
        completionTokens?: number;
        costLabel?: number;
        decisionId: string;
        fallbackUsed: boolean;
        finalModelId?: Id<"models">;
        finalSuccess: boolean;
        latencyLabel?: number;
        latencyMs?: number;
        promptHash?: string;
        promptPreview?: string;
        promptTokens?: number;
        qualityLabel?: number;
        totalTokens?: number;
        validationPassed?: boolean;
      },
      { ok: boolean }
    >;
    selectModel: FunctionReference<
      "mutation",
      "public",
      {
        constraints?: {
          hardCostLimit?: boolean;
          hardLatencyLimit?: boolean;
          maxCost?: number;
          maxLatencyMs?: number;
        };
        requestContext?: {
          attachmentTypes?: Array<string>;
          complexityScore?: number;
          estimatedInputTokens?: number;
          estimatedOutputTokens?: number;
          needsLongContext?: boolean;
          prompt?: string;
          promptChars?: number;
          requiresReasoning?: boolean;
          requiresTools?: boolean;
          taskType?: "chat" | "coding" | "analysis" | "rewrite" | "qa";
          toolTypes?: Array<string>;
        };
        requiresReasoning?: {
          enabled: boolean;
          level?: "low" | "medium" | "high";
        };
        requiresTools?: { enabled: boolean; toolTypes?: Array<string> };
        threadId?: string;
        tier: "free" | "pro" | "advanced" | "light" | "medium";
        userId?: Id<"users">;
      },
      {
        complexityScore: number;
        consideredModels: Array<{
          modelDocId: Id<"models">;
          modelName: string;
          score: number;
        }>;
        decisionId: string;
        estimatedCost: number | null;
        fallbackChain: Array<{
          modelDocId: Id<"models">;
          modelName: string;
          providerName: string;
        }>;
        scoreBreakdown: {
          contextFit: number;
          costFit: number;
          qualityFit: number;
          riskPenalty: number;
          speedFit: number;
          toolFit: number;
          totalScore: number;
        };
        selectedModel: {
          modelDocId: Id<"models">;
          modelId: string;
          modelName: string;
          providerDocId: Id<"providers">;
          providerName: string;
          providerType: string;
        };
        taskType: "chat" | "coding" | "analysis" | "rewrite" | "qa";
      }
    >;
    upsertModelSelectionProfile: FunctionReference<
      "mutation",
      "public",
      {
        benchmarkScores?: Record<string, number>;
        capabilities?: Array<string>;
        contextWindow?: number;
        historicalSuccessRate?: number;
        isExternal?: boolean;
        latencyStats?: { p50Ms: number; p95Ms: number };
        maxOutputTokens?: number;
        modelId: Id<"models">;
        pricing?: {
          currency?: string;
          inputPer1M: number;
          outputPer1M: number;
          tiers?: Array<{
            inputPer1M: number;
            maxContextTokens: number;
            outputPer1M: number;
          }>;
        };
        riskScore?: number;
        tierAllowed: Array<"free" | "pro" | "advanced" | "light" | "medium">;
        toolCallReliability?: number;
      },
      Id<"modelSelectionProfiles">
    >;
    upsertRoutingPolicy: FunctionReference<
      "mutation",
      "public",
      {
        allowedModelIds?: Array<Id<"models">>;
        contextWeight?: number;
        costWeight?: number;
        fallbackModelIds?: Array<Id<"models">>;
        id?: Id<"modelRoutingPolicies">;
        isEnabled: boolean;
        maxCostPerRequest?: number;
        maxLatencyMs?: number;
        minQualityScore?: number;
        qualityWeight?: number;
        riskWeight?: number;
        speedWeight?: number;
        taskType?: "chat" | "coding" | "analysis" | "rewrite" | "qa";
        tier: "free" | "pro" | "advanced" | "light" | "medium";
        toolWeight?: number;
      },
      Id<"modelRoutingPolicies">
    >;
  };
  projectContext: {
    createGithubRepoSource: FunctionReference<
      "mutation",
      "public",
      {
        config: {
          defaultBranch?: string;
          includeIssues: boolean;
          includePathGlobs: Array<string>;
          includePullRequests: boolean;
          owner: string;
          recentDays?: number;
          repo: string;
        };
        connectionId: Id<"integrationConnections">;
        projectId: Id<"projects">;
      },
      { sourceId: string }
    >;
    createGmailQuerySource: FunctionReference<
      "mutation",
      "public",
      {
        config: { includeBody?: boolean; maxThreads?: number; query: string };
        connectionId: Id<"integrationConnections">;
        projectId: Id<"projects">;
      },
      { sourceId: string }
    >;
    createManualLinkArtifact: FunctionReference<
      "mutation",
      "public",
      { projectId: Id<"projects">; title?: string; url: string },
      { artifactId: string }
    >;
    createUploadedArtifact: FunctionReference<
      "mutation",
      "public",
      {
        filename: string;
        mediaType?: string;
        projectId: Id<"projects">;
        storageId: Id<"_storage">;
      },
      { artifactId: string }
    >;
    generateProjectUploadUrl: FunctionReference<
      "mutation",
      "public",
      { projectId: Id<"projects"> },
      string
    >;
    getProjectWorkspace: FunctionReference<
      "query",
      "public",
      { projectId: Id<"projects"> },
      null | {
        counts: {
          artifacts: number;
          chats: number;
          members: number;
          sources: number;
        };
        createdAt: number;
        description?: string;
        id: string;
        name: string;
        role: "owner" | "editor" | "viewer";
        updatedAt: number;
        visibility: "private" | "shared";
      }
    >;
    listProjectArtifacts: FunctionReference<
      "query",
      "public",
      {
        includeInContext?: boolean;
        kind?:
          | "repo_file"
          | "pull_request"
          | "issue"
          | "commit"
          | "email_thread"
          | "email_message"
          | "email_attachment"
          | "uploaded_file"
          | "external_link";
        pinned?: boolean;
        projectId: Id<"projects">;
        provider?: "github" | "gmail" | "manual";
        query?: string;
      },
      Array<{
        extractionError?: string;
        extractionStatus?: "pending" | "ready" | "error";
        id: string;
        includeInContext: boolean;
        kind:
          | "repo_file"
          | "pull_request"
          | "issue"
          | "commit"
          | "email_thread"
          | "email_message"
          | "email_attachment"
          | "uploaded_file"
          | "external_link";
        metadata: any;
        mimeType?: string;
        pinned: boolean;
        projectId: string;
        provider: "github" | "gmail" | "manual";
        sourceId: string;
        status: "active" | "archived" | "error";
        subtitle?: string;
        title: string;
        updatedAt: number;
        url?: string;
      }>
    >;
    listProjectSources: FunctionReference<
      "query",
      "public",
      { projectId: Id<"projects"> },
      Array<{
        config: any;
        connectionId?: string;
        createdAt: number;
        id: string;
        kind: "github_repo" | "gmail_query" | "manual_uploads" | "manual_links";
        lastError?: string;
        lastSyncedAt?: number;
        projectId: string;
        provider: "github" | "gmail" | "manual";
        status: "active" | "paused" | "error";
        syncMode: "rule" | "manual";
        title: string;
        updatedAt: number;
      }>
    >;
    syncProjectSourceNow: FunctionReference<
      "mutation",
      "public",
      { projectId: Id<"projects">; sourceId: Id<"projectSources"> },
      { jobId: string }
    >;
    updateProjectArtifact: FunctionReference<
      "mutation",
      "public",
      {
        artifactId: Id<"projectArtifacts">;
        includeInContext?: boolean;
        pinned?: boolean;
        projectId: Id<"projects">;
        title?: string;
      },
      null
    >;
  };
  projectMembers: {
    addProjectMember: FunctionReference<
      "mutation",
      "public",
      {
        projectId: Id<"projects">;
        role: "owner" | "editor" | "viewer";
        userId: Id<"users">;
      },
      null
    >;
    listProjectMembers: FunctionReference<
      "query",
      "public",
      { projectId: Id<"projects"> },
      Array<{
        createdAt: number;
        id: string;
        invitedByUserId?: string;
        role: "owner" | "editor" | "viewer";
        updatedAt: number;
        userId: string;
      }>
    >;
    removeProjectMember: FunctionReference<
      "mutation",
      "public",
      { projectId: Id<"projects">; userId: Id<"users"> },
      null
    >;
    updateProjectMemberRole: FunctionReference<
      "mutation",
      "public",
      {
        projectId: Id<"projects">;
        role: "owner" | "editor" | "viewer";
        userId: Id<"users">;
      },
      null
    >;
  };
  projects: {
    assignThreadToProject: FunctionReference<
      "mutation",
      "public",
      { projectId: Id<"projects">; threadId: string },
      any
    >;
    createProject: FunctionReference<
      "mutation",
      "public",
      { description?: string; name: string },
      any
    >;
    deleteProject: FunctionReference<
      "mutation",
      "public",
      { projectId: Id<"projects"> },
      any
    >;
    getProjectForThread: FunctionReference<
      "query",
      "public",
      { threadId: string },
      null | {
        createdAt: number;
        description?: string;
        id: string;
        name: string;
        updatedAt: number;
      }
    >;
    listProjects: FunctionReference<"query", "public", any, any>;
    listThreadsByProject: FunctionReference<
      "query",
      "public",
      { projectId: Id<"projects"> },
      any
    >;
    migrateLegacyThreadProjectAssignments: FunctionReference<
      "mutation",
      "public",
      {},
      any
    >;
    migrateProjectOwnership: FunctionReference<
      "mutation",
      "public",
      {},
      { ensuredMemberships: number; updatedProjects: number }
    >;
    removeThreadFromProject: FunctionReference<
      "mutation",
      "public",
      { threadId: string },
      any
    >;
    suggestProjectFromContext: FunctionReference<
      "action",
      "public",
      {
        draft: string;
        mentionQuery?: string;
        modelId?: Id<"models">;
        threadId?: string;
      },
      {
        description?: string;
        name: string;
        reason?: string;
        source: "ai" | "fallback";
      }
    >;
    updateProject: FunctionReference<
      "mutation",
      "public",
      { description?: string; name?: string; projectId: Id<"projects"> },
      any
    >;
  };
  sections: {
    createSection: FunctionReference<
      "mutation",
      "public",
      { emoji?: string; name: string },
      any
    >;
    deleteSection: FunctionReference<
      "mutation",
      "public",
      { id: Id<"sections"> },
      any
    >;
    listSections: FunctionReference<"query", "public", {}, any>;
    toggleSection: FunctionReference<
      "mutation",
      "public",
      { id: Id<"sections"> },
      any
    >;
    updateSection: FunctionReference<
      "mutation",
      "public",
      {
        emoji?: string;
        id: Id<"sections">;
        isExpanded?: boolean;
        name?: string;
        sortOrder?: number;
      },
      any
    >;
  };
  shares: {
    createOrUpdateChatShare: FunctionReference<
      "mutation",
      "public",
      { threadId: string },
      any
    >;
    getChatShare: FunctionReference<
      "query",
      "public",
      { token: string },
      null | {
        createdAt: number;
        messageCount: number;
        title: string;
        updatedAt: number;
      }
    >;
    listChatShareMessages: FunctionReference<
      "query",
      "public",
      {
        paginationOpts: {
          cursor: string | null;
          endCursor?: string | null;
          id?: number;
          maximumBytesRead?: number;
          maximumRowsRead?: number;
          numItems: number;
        };
        token: string;
      },
      {
        continueCursor: string;
        isDone: boolean;
        page: Array<{
          order: number;
          role: "user" | "assistant";
          text: string;
        }>;
      }
    >;
  };
  sidebarSearch: {
    searchSidebar: FunctionReference<
      "action",
      "public",
      { limit?: number; query: string },
      any
    >;
  };
  stripe: {
    createBillingPortalSession: FunctionReference<
      "action",
      "public",
      { origin: string },
      { url: string }
    >;
    createProSubscriptionCheckout: FunctionReference<
      "action",
      "public",
      { origin: string },
      { sessionId: string; url: string | null }
    >;
  };
  users: {
    ensureCurrentUser: FunctionReference<"mutation", "public", {}, any>;
    getOrCreateProfile: FunctionReference<"mutation", "public", {}, any>;
    getProfile: FunctionReference<"query", "public", {}, any>;
    getSettings: FunctionReference<
      "query",
      "public",
      {},
      null | {
        _creationTime: number;
        _id: Id<"userSettings">;
        bio?: string;
        displayName?: string;
        image?: string;
        reasoningEnabled?: boolean;
        reasoningLevel?: "low" | "medium" | "high";
        updatedAt: number;
        userId: Id<"users">;
        voiceTranscriptionMode?: "cloud" | "device";
      }
    >;
    updateSettings: FunctionReference<
      "mutation",
      "public",
      {
        bio?: string;
        displayName?: string;
        image?: string;
        reasoningEnabled?: boolean;
        reasoningLevel?: "low" | "medium" | "high";
        voiceTranscriptionMode?: "cloud" | "device";
      },
      { success: boolean }
    >;
    viewer: FunctionReference<"query", "public", {}, any>;
  };
  voice: {
    generateUploadUrl: FunctionReference<"mutation", "public", {}, string>;
    transcribeAudio: FunctionReference<
      "action",
      "public",
      {
        filename?: string;
        language?: string;
        mimeType: string;
        storageId: Id<"_storage">;
      },
      { language?: string; provider: "cloud"; text: string }
    >;
  };
};

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: {
  admin: {
    getAdminContext: FunctionReference<"query", "internal", {}, any>;
    recordModelUsage: FunctionReference<
      "mutation",
      "internal",
      {
        completionTokens: number;
        createdAt: number;
        modelId: Id<"models">;
        modelName: string;
        promptTokens: number;
        providerId: Id<"providers">;
        providerName: string;
        providerType: string;
        routerDecisionId?: string;
        threadId: string;
        totalTokens: number;
        userId: Id<"users">;
      },
      any
    >;
    storeProviderDiscoveryState: FunctionReference<
      "mutation",
      "internal",
      {
        lastDiscoveredAt: number;
        lastDiscoveredModelCount: number;
        lastDiscoveryError: string;
        providerId: Id<"providers">;
      },
      any
    >;
  };
  agents: {
    applyThreadMetadataUpdate: FunctionReference<
      "mutation",
      "internal",
      {
        emoji?: string;
        icon?: string;
        threadId: string;
        title?: string;
        userId?: Id<"users">;
      },
      { emoji: string; icon?: string; title?: string; updated: boolean }
    >;
    createToolPolicyEvent: FunctionReference<
      "mutation",
      "internal",
      {
        automaticActions: Array<string>;
        detectedIntent?:
          | "memory_search"
          | "memory_add"
          | "memory_update"
          | "memory_delete"
          | "metadata_refresh"
          | "none";
        error?: string;
        policyTrace: Array<string>;
        policyVersion: string;
        promptMessageId?: string;
        requiredActions: Array<string>;
        status: "evaluated" | "completed" | "skipped" | "failed";
        systemAddendum: string;
        threadId: string;
        userId: Id<"users">;
      },
      Id<"toolPolicyEvents">
    >;
    getThreadPresentation: FunctionReference<
      "query",
      "internal",
      { threadId: string },
      null | {
        emoji: string;
        icon?: string;
        lastLabelUpdateAt: number;
        title?: string;
        userId?: string;
      }
    >;
    streamMessage: FunctionReference<
      "action",
      "internal",
      {
        agent:
          | "openrouter"
          | "openai"
          | "anthropic"
          | "google"
          | "azure"
          | "groq"
          | "deepseek"
          | "xai"
          | "cerebras"
          | "openai-compatible"
          | "opencode"
          | "mistral"
          | "cohere"
          | "perplexity"
          | "fireworks"
          | "together"
          | "replicate"
          | "moonshot"
          | "qwen"
          | "stepfun";
        apiKey?: string;
        config?: {
          headers?: Record<string, string>;
          organization?: string;
          project?: string;
          queryParams?: Record<string, string>;
        };
        contextArtifactIds?: Array<Id<"projectArtifacts">>;
        customUrl?: string;
        modelDocId: Id<"models">;
        modelId: string;
        modelName: string;
        projectId?: Id<"projects">;
        prompt?: string;
        promptMessageId?: string;
        providerDocId: Id<"providers">;
        providerName: string;
        reasoning?: { enabled: boolean; level?: "low" | "medium" | "high" };
        routerDecisionId?: string;
        searchEnabled?: boolean;
        searchMode?: "auto" | "required";
        threadId: string;
        userId: Id<"users">;
      },
      any
    >;
    updateToolPolicyEvent: FunctionReference<
      "mutation",
      "internal",
      {
        automaticActions?: Array<string>;
        error?: string;
        eventId: Id<"toolPolicyEvents">;
        observedTools?: Array<string>;
        satisfiedActions?: Array<string>;
        status?: "evaluated" | "completed" | "skipped" | "failed";
      },
      null
    >;
  };
  functions: {
    memoryContext: {
      buildPromptMemoryContext: FunctionReference<
        "action",
        "internal",
        {
          projectId?: Id<"projects">;
          prompt: string;
          threadId: string;
          userId: Id<"users">;
        },
        {
          project: null | { description?: string; id: string; name: string };
          projectHits: Array<{
            category?: string;
            content: string;
            createdAt: number;
            memoryId: string;
            originMessageIds?: Array<string>;
            originThreadId?: string;
            projectId?: string;
            rank: number;
            scope: "user" | "thread" | "project";
            score?: number;
            source: string;
            tags?: Array<string>;
            threadId?: string;
            title: string;
            updatedAt: number;
            userId: string;
          }>;
          text: string;
          threadHits: Array<{
            category?: string;
            content: string;
            createdAt: number;
            memoryId: string;
            originMessageIds?: Array<string>;
            originThreadId?: string;
            projectId?: string;
            rank: number;
            scope: "user" | "thread" | "project";
            score?: number;
            source: string;
            tags?: Array<string>;
            threadId?: string;
            title: string;
            updatedAt: number;
            userId: string;
          }>;
          userHits: Array<{
            category?: string;
            content: string;
            createdAt: number;
            memoryId: string;
            originMessageIds?: Array<string>;
            originThreadId?: string;
            projectId?: string;
            rank: number;
            scope: "user" | "thread" | "project";
            score?: number;
            source: string;
            tags?: Array<string>;
            threadId?: string;
            title: string;
            updatedAt: number;
            userId: string;
          }>;
        }
      >;
    };
    memoryExtraction: {
      extractMemoriesFromThread: FunctionReference<
        "action",
        "internal",
        { threadId: string },
        any
      >;
    };
    memoryHelpers: {
      getProjectMemoryById: FunctionReference<
        "query",
        "internal",
        { id: Id<"projectMemories"> },
        any
      >;
      getThreadMemoryById: FunctionReference<
        "query",
        "internal",
        { id: Id<"threadMemories"> },
        any
      >;
      getUserMemoryById: FunctionReference<
        "query",
        "internal",
        { id: Id<"userMemories"> },
        any
      >;
    };
    memoryInternal: {
      createMemoryInScope: FunctionReference<
        "action",
        "internal",
        {
          category?: string;
          content: string;
          originMessageIds?: Array<string>;
          originThreadId?: string;
          projectId?: Id<"projects">;
          scope: "user" | "thread" | "project";
          source: "manual" | "extracted" | "system";
          tags?: Array<string>;
          threadId?: string;
          title: string;
          userId: Id<"users">;
        },
        any
      >;
      deleteMemoryInScope: FunctionReference<
        "action",
        "internal",
        {
          projectMemoryId?: Id<"projectMemories">;
          scope: "user" | "thread" | "project";
          threadMemoryId?: Id<"threadMemories">;
          userId: Id<"users">;
          userMemoryId?: Id<"userMemories">;
        },
        any
      >;
      deleteProjectMemoryRecord: FunctionReference<
        "mutation",
        "internal",
        { memoryId: Id<"projectMemories"> },
        any
      >;
      deleteThreadMemoryRecord: FunctionReference<
        "mutation",
        "internal",
        { memoryId: Id<"threadMemories"> },
        any
      >;
      deleteUserMemoryRecord: FunctionReference<
        "mutation",
        "internal",
        { memoryId: Id<"userMemories"> },
        any
      >;
      findProjectMemoryByContentHash: FunctionReference<
        "query",
        "internal",
        { contentHash: string; projectId: Id<"projects"> },
        any
      >;
      findThreadMemoryByContentHash: FunctionReference<
        "query",
        "internal",
        { contentHash: string; threadId: string },
        any
      >;
      findUserMemoryByContentHash: FunctionReference<
        "query",
        "internal",
        { contentHash: string; userId: Id<"users"> },
        any
      >;
      getExtractionStateByThread: FunctionReference<
        "query",
        "internal",
        { threadId: string },
        any
      >;
      getProjectById: FunctionReference<
        "query",
        "internal",
        { projectId: Id<"projects"> },
        any
      >;
      getProjectForThread: FunctionReference<
        "query",
        "internal",
        { threadId: string; userId: Id<"users"> },
        any
      >;
      getProjectMemoriesByIds: FunctionReference<
        "query",
        "internal",
        { ids: Array<Id<"projectMemories">> },
        any
      >;
      getProjectMemoryById: FunctionReference<
        "query",
        "internal",
        { id: Id<"projectMemories"> },
        any
      >;
      getThreadMemoriesByIds: FunctionReference<
        "query",
        "internal",
        { ids: Array<Id<"threadMemories">> },
        any
      >;
      getThreadMemoryById: FunctionReference<
        "query",
        "internal",
        { id: Id<"threadMemories"> },
        any
      >;
      getUserMemoriesByIds: FunctionReference<
        "query",
        "internal",
        { ids: Array<Id<"userMemories">> },
        any
      >;
      getUserMemoryById: FunctionReference<
        "query",
        "internal",
        { id: Id<"userMemories"> },
        any
      >;
      hasProjectAccessForUser: FunctionReference<
        "query",
        "internal",
        {
          minimumRole?: "owner" | "editor" | "viewer";
          projectId: Id<"projects">;
          userId: Id<"users">;
        },
        boolean
      >;
      insertProjectMemory: FunctionReference<
        "mutation",
        "internal",
        {
          category?: string;
          content: string;
          contentHash: string;
          createdAt: number;
          originMessageIds?: Array<string>;
          originThreadId?: string;
          projectId: Id<"projects">;
          ragKey: string;
          source: "manual" | "aggregated";
          tags?: Array<string>;
          title: string;
          updatedAt: number;
          userId: Id<"users">;
        },
        any
      >;
      insertThreadMemory: FunctionReference<
        "mutation",
        "internal",
        {
          category?: string;
          content: string;
          contentHash: string;
          createdAt: number;
          originMessageIds?: Array<string>;
          originThreadId?: string;
          ragKey: string;
          source: "manual" | "session";
          tags?: Array<string>;
          threadId: string;
          title: string;
          updatedAt: number;
          userId: Id<"users">;
        },
        any
      >;
      insertUserMemory: FunctionReference<
        "mutation",
        "internal",
        {
          category?: string;
          content: string;
          contentHash: string;
          createdAt: number;
          originMessageIds?: Array<string>;
          originThreadId?: string;
          ragKey: string;
          source: "manual" | "extracted" | "system";
          tags?: Array<string>;
          title: string;
          updatedAt: number;
          userId: Id<"users">;
        },
        any
      >;
      listProjectsForThread: FunctionReference<
        "query",
        "internal",
        { threadId: string; userId: Id<"users"> },
        any
      >;
      patchProjectMemory: FunctionReference<
        "mutation",
        "internal",
        {
          category?: string;
          content: string;
          contentHash: string;
          memoryId: Id<"projectMemories">;
          originMessageIds?: Array<string>;
          originThreadId?: string;
          source: "manual" | "aggregated";
          tags?: Array<string>;
          title: string;
          updatedAt: number;
        },
        any
      >;
      patchProjectMemoryRagKey: FunctionReference<
        "mutation",
        "internal",
        { memoryId: Id<"projectMemories">; ragKey: string },
        any
      >;
      patchThreadMemory: FunctionReference<
        "mutation",
        "internal",
        {
          category?: string;
          content: string;
          contentHash: string;
          memoryId: Id<"threadMemories">;
          originMessageIds?: Array<string>;
          originThreadId?: string;
          source: "manual" | "session";
          tags?: Array<string>;
          title: string;
          updatedAt: number;
        },
        any
      >;
      patchThreadMemoryRagKey: FunctionReference<
        "mutation",
        "internal",
        { memoryId: Id<"threadMemories">; ragKey: string },
        any
      >;
      patchUserMemory: FunctionReference<
        "mutation",
        "internal",
        {
          category?: string;
          content: string;
          contentHash: string;
          memoryId: Id<"userMemories">;
          originMessageIds?: Array<string>;
          originThreadId?: string;
          source: "manual" | "extracted" | "system";
          tags?: Array<string>;
          title: string;
          updatedAt: number;
        },
        any
      >;
      patchUserMemoryRagKey: FunctionReference<
        "mutation",
        "internal",
        { memoryId: Id<"userMemories">; ragKey: string },
        any
      >;
      updateMemoryInScope: FunctionReference<
        "action",
        "internal",
        {
          category?: string;
          content?: string;
          projectMemoryId?: Id<"projectMemories">;
          scope: "user" | "thread" | "project";
          tags?: Array<string>;
          threadMemoryId?: Id<"threadMemories">;
          title?: string;
          userId: Id<"users">;
          userMemoryId?: Id<"userMemories">;
        },
        any
      >;
      upsertExtractionState: FunctionReference<
        "mutation",
        "internal",
        {
          error?: string;
          lastProcessedOrder: number;
          status?: "idle" | "running" | "error";
          threadId: string;
          updatedAt: number;
          userId: Id<"users">;
        },
        any
      >;
    };
    projectRetrieval: {
      buildPromptProjectContext: FunctionReference<
        "action",
        "internal",
        {
          explicitArtifactIds?: Array<Id<"projectArtifacts">>;
          projectId?: Id<"projects">;
          prompt: string;
          threadId: string;
          userId: Id<"users">;
        },
        {
          hits: Array<{
            artifactId: string;
            kind: string;
            provider: string;
            score: number;
            snippet?: string;
            title: string;
            url?: string;
          }>;
          text: string;
        }
      >;
      getArtifactByIdForProject: FunctionReference<
        "query",
        "internal",
        {
          artifactId: Id<"projectArtifacts">;
          projectId: Id<"projects">;
          userId: Id<"users">;
        },
        null | {
          content?: string;
          id: string;
          includeInContext: boolean;
          kind: string;
          pinned: boolean;
          provider: string;
          title: string;
          url?: string;
        }
      >;
      searchProjectContext: FunctionReference<
        "query",
        "internal",
        {
          explicitArtifactIds?: Array<Id<"projectArtifacts">>;
          maxResults?: number;
          projectId: Id<"projects">;
          query: string;
          userId: Id<"users">;
        },
        Array<{
          artifactId: Id<"projectArtifacts">;
          includeInContext: boolean;
          kind: string;
          pinned: boolean;
          provider: string;
          score: number;
          snippet?: string;
          title: string;
          url?: string;
        }>
      >;
    };
    projectSync: {
      getSyncJobById: FunctionReference<
        "query",
        "internal",
        { jobId: Id<"projectSyncJobs"> },
        null | {
          _id: Id<"projectSyncJobs">;
          projectId: Id<"projects">;
          sourceId: Id<"projectSources">;
          status: "queued" | "running" | "done" | "error";
        }
      >;
      markSyncJobDone: FunctionReference<
        "mutation",
        "internal",
        { jobId: Id<"projectSyncJobs"> },
        null
      >;
      markSyncJobError: FunctionReference<
        "mutation",
        "internal",
        { error: string; jobId: Id<"projectSyncJobs"> },
        null
      >;
      markSyncJobRunning: FunctionReference<
        "mutation",
        "internal",
        { jobId: Id<"projectSyncJobs"> },
        null
      >;
      runSyncJob: FunctionReference<
        "action",
        "internal",
        { jobId: Id<"projectSyncJobs"> },
        null
      >;
      syncManualLinkSource: FunctionReference<
        "action",
        "internal",
        { projectId: Id<"projects">; sourceId: Id<"projectSources"> },
        null
      >;
    };
  };
  integrations: {
    consumeOAuthState: FunctionReference<
      "mutation",
      "internal",
      { provider: "github" | "google"; state: string },
      null | { redirectTo: string; userId: Id<"users"> }
    >;
    exchangeOAuthCode: FunctionReference<
      "action",
      "internal",
      { code: string; provider: "github" | "google" },
      {
        accessToken: string;
        accountLabel: string;
        accountSubject: string;
        expiresAt?: number;
        provider: "github" | "google";
        refreshToken?: string;
        scopes: Array<string>;
      }
    >;
    getConnectionByIdForOwner: FunctionReference<
      "query",
      "internal",
      { connectionId: Id<"integrationConnections">; ownerUserId: Id<"users"> },
      null | {
        _id: Id<"integrationConnections">;
        accessTokenCiphertext: string;
        ownerUserId: Id<"users">;
      }
    >;
    upsertOAuthConnection: FunctionReference<
      "mutation",
      "internal",
      {
        accessToken: string;
        accountLabel: string;
        accountSubject: string;
        expiresAt?: number;
        provider: "github" | "google";
        refreshToken?: string;
        scopes: Array<string>;
        userId: Id<"users">;
      },
      Id<"integrationConnections">
    >;
  };
  modelRouter: {
    getAutoModelRoutingState: FunctionReference<
      "query",
      "internal",
      {},
      {
        available: boolean;
        models: Array<{
          capabilities?: Array<string>;
          contextWindow?: number;
          displayName: string;
          id: Id<"models">;
          intelligence: number;
          latency: number;
          modelId: string;
          price: number;
          providerId: Id<"providers">;
          providerName: string;
          speed: number;
          supportsTools: boolean;
          taskScores: {
            analysis: number;
            code: number;
            general: number;
            math: number;
          };
        }>;
        preference?: "balanced" | "cost" | "speed" | "quality";
        routerApiKey?: string;
        routerUrl?: string;
      }
    >;
    getCurrentUserId: FunctionReference<
      "query",
      "internal",
      {},
      Id<"users"> | null
    >;
    recordAutoModelDecision: FunctionReference<
      "mutation",
      "internal",
      {
        createdAt: number;
        decisionId: string;
        error?: string;
        latencyMs?: number;
        reasoningEnabled: boolean;
        requestChars: number;
        requestPreview?: string;
        routerPreference?: "balanced" | "cost" | "speed" | "quality";
        routerUrl?: string;
        searchEnabled: boolean;
        selectedModelId?: Id<"models">;
        selectedModelKey?: string;
        selectedModelName?: string;
        selectedProviderId?: Id<"providers">;
        selectedProviderName?: string;
        status: "success" | "failed";
        threadId?: string;
        userId?: Id<"users">;
      },
      null
    >;
  };
  projectContext: {
    getProjectSourceInternal: FunctionReference<
      "query",
      "internal",
      { sourceId: Id<"projectSources"> },
      null | {
        _id: Id<"projectSources">;
        kind: "github_repo" | "gmail_query" | "manual_uploads" | "manual_links";
        projectId: Id<"projects">;
        provider: "github" | "gmail" | "manual";
      }
    >;
    listArtifactsByProjectInternal: FunctionReference<
      "query",
      "internal",
      { projectId: Id<"projects"> },
      Array<{
        _id: Id<"projectArtifacts">;
        kind:
          | "repo_file"
          | "pull_request"
          | "issue"
          | "commit"
          | "email_thread"
          | "email_message"
          | "email_attachment"
          | "uploaded_file"
          | "external_link";
        sourceId: Id<"projectSources">;
        url?: string;
      }>
    >;
    touchProjectSourceInternal: FunctionReference<
      "mutation",
      "internal",
      { clearError?: boolean; sourceId: Id<"projectSources"> },
      null
    >;
    upsertProjectArtifactContentInternal: FunctionReference<
      "mutation",
      "internal",
      {
        artifactId: Id<"projectArtifacts">;
        contentHash: string;
        error?: string;
        extractionStatus: "pending" | "ready" | "error";
        projectId: Id<"projects">;
        text: string;
      },
      null
    >;
  };
  projects: {
    getProjectSuggestionContext: FunctionReference<
      "query",
      "internal",
      { threadId?: string },
      { recentTranscript?: string; threadTitle?: string; userId: Id<"users"> }
    >;
    resolveProjectSuggestionModel: FunctionReference<
      "query",
      "internal",
      { modelId?: Id<"models"> },
      string
    >;
  };
  sidebarSearch: {
    getSearchUserId: FunctionReference<"query", "internal", {}, string | null>;
    getThreadSearchMetadata: FunctionReference<
      "query",
      "internal",
      { threadIds: Array<string>; userId: string },
      Array<{
        projectId?: string;
        projectName?: string;
        threadId: string;
        threadTitle: string;
      }>
    >;
  };
  users: {
    deleteUser: FunctionReference<"mutation", "internal", { id: string }, any>;
    getUser: FunctionReference<"query", "internal", { subject: string }, any>;
    updateOrCreateUser: FunctionReference<
      "mutation",
      "internal",
      { clerkUser: any },
      any
    >;
  };
};

export declare const components: {
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
  rag: import("@convex-dev/rag/_generated/component.js").ComponentApi<"rag">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
  stripe: import("@convex-dev/stripe/_generated/component.js").ComponentApi<"stripe">;
};
