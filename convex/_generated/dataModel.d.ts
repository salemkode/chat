/* eslint-disable */
/**
 * Generated data model types.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  DocumentByName,
  TableNamesInDataModel,
  SystemTableNames,
  AnyDataModel,
} from "convex/server";
import type { GenericId } from "convex/values";

/**
 * A type describing your Convex data model.
 *
 * This type includes information about what tables you have, the type of
 * documents stored in those tables, and the indexes defined on them.
 *
 * This type is used to parameterize methods like `queryGeneric` and
 * `mutationGeneric` to make them type-safe.
 */

export type DataModel = {
  admins: {
    document: { userId: Id<"users">; _id: Id<"admins">; _creationTime: number };
    fieldPaths: "_creationTime" | "_id" | "userId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_userId: ["userId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  adminSettings: {
    document: {
      appPlan: "free" | "pro";
      defaultRateLimit?: {
        capacity?: number;
        enabled: boolean;
        kind: "fixed window" | "token bucket";
        period: number;
        rate: number;
        scope: "global" | "user";
        shards?: number;
      };
      key: string;
      updatedAt: number;
      _id: Id<"adminSettings">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "appPlan"
      | "defaultRateLimit"
      | "defaultRateLimit.capacity"
      | "defaultRateLimit.enabled"
      | "defaultRateLimit.kind"
      | "defaultRateLimit.period"
      | "defaultRateLimit.rate"
      | "defaultRateLimit.scope"
      | "defaultRateLimit.shards"
      | "key"
      | "updatedAt";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_key: ["key", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  chatShareMessages: {
    document: {
      order: number;
      role: "user" | "assistant";
      shareId: Id<"chatShares">;
      text: string;
      _id: Id<"chatShareMessages">;
      _creationTime: number;
    };
    fieldPaths: "_creationTime" | "_id" | "order" | "role" | "shareId" | "text";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_share_order: ["shareId", "order", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  chatShares: {
    document: {
      createdAt: number;
      messageCount: number;
      ownerUserId: Id<"users">;
      threadId: string;
      title?: string;
      token: string;
      updatedAt: number;
      _id: Id<"chatShares">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "createdAt"
      | "messageCount"
      | "ownerUserId"
      | "threadId"
      | "title"
      | "token"
      | "updatedAt";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_thread_owner: ["threadId", "ownerUserId", "_creationTime"];
      by_token: ["token", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  memoryChunks: {
    document: {
      agentId: string;
      embedding: Array<number>;
      endLine: number;
      fileId: Id<"memoryFiles">;
      hash: string;
      model: string;
      path: string;
      source: "memory" | "sessions";
      startLine: number;
      text: string;
      updatedAt: number;
      _id: Id<"memoryChunks">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "agentId"
      | "embedding"
      | "endLine"
      | "fileId"
      | "hash"
      | "model"
      | "path"
      | "source"
      | "startLine"
      | "text"
      | "updatedAt";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_agent: ["agentId", "_creationTime"];
      by_file: ["fileId", "_creationTime"];
      by_path: ["path", "agentId", "_creationTime"];
      by_source: ["source", "agentId", "_creationTime"];
      by_updated: ["updatedAt", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {
      by_embedding: {
        vectorField: "embedding";
        dimensions: number;
        filterFields: "agentId" | "model" | "source";
      };
    };
  };
  memoryEmbeddingCache: {
    document: {
      dims?: number;
      embedding: Array<number>;
      hash: string;
      model: string;
      provider: string;
      providerKey: string;
      updatedAt: number;
      _id: Id<"memoryEmbeddingCache">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "dims"
      | "embedding"
      | "hash"
      | "model"
      | "provider"
      | "providerKey"
      | "updatedAt";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_composite: [
        "provider",
        "model",
        "providerKey",
        "hash",
        "_creationTime",
      ];
      by_updated: ["updatedAt", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  memoryExtractionState: {
    document: {
      error?: string;
      lastProcessedOrder: number;
      status?: "idle" | "running" | "error";
      threadId: string;
      updatedAt: number;
      userId: Id<"users">;
      _id: Id<"memoryExtractionState">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "error"
      | "lastProcessedOrder"
      | "status"
      | "threadId"
      | "updatedAt"
      | "userId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_thread: ["threadId", "_creationTime"];
      by_user: ["userId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  memoryFiles: {
    document: {
      agentId: string;
      hash: string;
      lastSyncedAt?: number;
      mtime: number;
      path: string;
      size: number;
      source: "memory" | "sessions";
      _id: Id<"memoryFiles">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "agentId"
      | "hash"
      | "lastSyncedAt"
      | "mtime"
      | "path"
      | "size"
      | "source";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_agent: ["agentId", "_creationTime"];
      by_mtime: ["mtime", "_creationTime"];
      by_path: ["path", "agentId", "_creationTime"];
      by_source: ["source", "agentId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  memoryMeta: {
    document: {
      agentId: string;
      key: string;
      value: string;
      _id: Id<"memoryMeta">;
      _creationTime: number;
    };
    fieldPaths: "_creationTime" | "_id" | "agentId" | "key" | "value";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_key: ["key", "agentId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  memoryState: {
    document: {
      errorMessage?: string;
      lastSyncAt: number;
      status: "idle" | "syncing" | "error";
      userId: Id<"users">;
      _id: Id<"memoryState">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "errorMessage"
      | "lastSyncAt"
      | "status"
      | "userId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_user: ["userId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  memorySyncState: {
    document: {
      agentId: string;
      dirty: boolean;
      error?: string;
      lastFullSync: number;
      pendingFiles: Array<string>;
      _id: Id<"memorySyncState">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "agentId"
      | "dirty"
      | "error"
      | "lastFullSync"
      | "pendingFiles";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_agent: ["agentId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  messages: {
    document: {
      body: string;
      role: "user" | "assistant";
      userId: Id<"users">;
      _id: Id<"messages">;
      _creationTime: number;
    };
    fieldPaths: "_creationTime" | "_id" | "body" | "role" | "userId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_userId: ["userId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  modelCollections: {
    document: {
      description?: string;
      modelIds: Array<Id<"models">>;
      name: string;
      sortOrder: number;
      _id: Id<"modelCollections">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "description"
      | "modelIds"
      | "name"
      | "sortOrder";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_sortOrder: ["sortOrder", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  models: {
    document: {
      capabilities?: Array<string>;
      contextWindow?: number;
      description?: string;
      discoveredAt?: number;
      displayName: string;
      icon?: string;
      iconId?: Id<"_storage">;
      iconType?: "emoji" | "lucide" | "upload";
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
      sortOrder: number;
      _id: Id<"models">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "capabilities"
      | "contextWindow"
      | "description"
      | "discoveredAt"
      | "displayName"
      | "icon"
      | "iconId"
      | "iconType"
      | "isEnabled"
      | "isFree"
      | "lastSyncedAt"
      | "maxOutputTokens"
      | "modalities"
      | "modalities.input"
      | "modalities.output"
      | "modelId"
      | "ownedBy"
      | "providerId"
      | "rateLimit"
      | "rateLimit.capacity"
      | "rateLimit.enabled"
      | "rateLimit.kind"
      | "rateLimit.period"
      | "rateLimit.rate"
      | "rateLimit.scope"
      | "rateLimit.shards"
      | "sortOrder";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_enabled: ["isEnabled", "_creationTime"];
      by_providerId: ["providerId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  modelUsageEvents: {
    document: {
      completionTokens: number;
      createdAt: number;
      modelId: Id<"models">;
      modelName: string;
      promptTokens: number;
      providerId: Id<"providers">;
      providerName: string;
      providerType: string;
      threadId: string;
      totalTokens: number;
      userId: Id<"users">;
      _id: Id<"modelUsageEvents">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "completionTokens"
      | "createdAt"
      | "modelId"
      | "modelName"
      | "promptTokens"
      | "providerId"
      | "providerName"
      | "providerType"
      | "threadId"
      | "totalTokens"
      | "userId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_createdAt: ["createdAt", "_creationTime"];
      by_model_createdAt: ["modelId", "createdAt", "_creationTime"];
      by_provider_createdAt: ["providerId", "createdAt", "_creationTime"];
      by_user_createdAt: ["userId", "createdAt", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  projectMemories: {
    document: {
      category?: string;
      content: string;
      contentHash: string;
      createdAt: number;
      embedding?: Array<number>;
      originMessageIds?: Array<string>;
      originThreadId?: string;
      projectId: Id<"projects">;
      ragKey: string;
      source: "manual" | "aggregated";
      tags?: Array<string>;
      title: string;
      updatedAt: number;
      userId: Id<"users">;
      _id: Id<"projectMemories">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "category"
      | "content"
      | "contentHash"
      | "createdAt"
      | "embedding"
      | "originMessageIds"
      | "originThreadId"
      | "projectId"
      | "ragKey"
      | "source"
      | "tags"
      | "title"
      | "updatedAt"
      | "userId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_project: ["projectId", "_creationTime"];
      by_project_contentHash: ["projectId", "contentHash", "_creationTime"];
      by_project_updated: ["projectId", "updatedAt", "_creationTime"];
      by_user: ["userId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  projects: {
    document: {
      createdAt: number;
      description?: string;
      name: string;
      threadIds?: Array<string>;
      updatedAt: number;
      userId: Id<"users">;
      _id: Id<"projects">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "createdAt"
      | "description"
      | "name"
      | "threadIds"
      | "updatedAt"
      | "userId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_updated: ["updatedAt", "_creationTime"];
      by_user: ["userId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  providers: {
    document: {
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
      iconType?: "emoji" | "lucide" | "upload";
      isEnabled: boolean;
      lastDiscoveredAt?: number;
      lastDiscoveredModelCount?: number;
      lastDiscoveryError?: string;
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
      _id: Id<"providers">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "apiKey"
      | "baseURL"
      | "config"
      | "config.headers"
      | `config.headers.${string}`
      | "config.organization"
      | "config.project"
      | "config.queryParams"
      | `config.queryParams.${string}`
      | "description"
      | "icon"
      | "iconId"
      | "iconType"
      | "isEnabled"
      | "lastDiscoveredAt"
      | "lastDiscoveredModelCount"
      | "lastDiscoveryError"
      | "name"
      | "providerType"
      | "rateLimit"
      | "rateLimit.capacity"
      | "rateLimit.enabled"
      | "rateLimit.kind"
      | "rateLimit.period"
      | "rateLimit.rate"
      | "rateLimit.scope"
      | "rateLimit.shards"
      | "sortOrder";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_enabled: ["isEnabled", "_creationTime"];
      by_providerType: ["providerType", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  sections: {
    document: {
      emoji: string;
      isExpanded: boolean;
      name: string;
      sortOrder: number;
      userId: Id<"users">;
      _id: Id<"sections">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "emoji"
      | "isExpanded"
      | "name"
      | "sortOrder"
      | "userId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_userId: ["userId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  threadMemories: {
    document: {
      category?: string;
      content: string;
      contentHash: string;
      createdAt: number;
      embedding?: Array<number>;
      originMessageIds?: Array<string>;
      originThreadId?: string;
      ragKey: string;
      source: "session" | "manual";
      tags?: Array<string>;
      threadId: string;
      title: string;
      updatedAt: number;
      userId: Id<"users">;
      _id: Id<"threadMemories">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "category"
      | "content"
      | "contentHash"
      | "createdAt"
      | "embedding"
      | "originMessageIds"
      | "originThreadId"
      | "ragKey"
      | "source"
      | "tags"
      | "threadId"
      | "title"
      | "updatedAt"
      | "userId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_thread: ["threadId", "_creationTime"];
      by_thread_contentHash: ["threadId", "contentHash", "_creationTime"];
      by_thread_updated: ["threadId", "updatedAt", "_creationTime"];
      by_user: ["userId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  threadMetadata: {
    document: {
      emoji: string;
      icon?: string;
      lastLabelUpdateAt: number;
      projectId?: Id<"projects">;
      sectionId?: Id<"sections">;
      sortOrder: number;
      threadId: string;
      userId: Id<"users">;
      _id: Id<"threadMetadata">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "emoji"
      | "icon"
      | "lastLabelUpdateAt"
      | "projectId"
      | "sectionId"
      | "sortOrder"
      | "threadId"
      | "userId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_projectId: ["projectId", "_creationTime"];
      by_sectionId: ["sectionId", "_creationTime"];
      by_threadId: ["threadId", "_creationTime"];
      by_userId: ["userId", "_creationTime"];
      by_userId_sortOrder: ["userId", "sortOrder", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  userFavoriteModels: {
    document: {
      createdAt: number;
      modelId: Id<"models">;
      userId: Id<"users">;
      _id: Id<"userFavoriteModels">;
      _creationTime: number;
    };
    fieldPaths: "_creationTime" | "_id" | "createdAt" | "modelId" | "userId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_user: ["userId", "_creationTime"];
      by_user_model: ["userId", "modelId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  userMemories: {
    document: {
      category?: string;
      content: string;
      contentHash: string;
      createdAt: number;
      embedding?: Array<number>;
      originMessageIds?: Array<string>;
      originThreadId?: string;
      ragKey: string;
      source: "manual" | "extracted" | "system";
      tags?: Array<string>;
      title: string;
      updatedAt: number;
      userId: Id<"users">;
      _id: Id<"userMemories">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "category"
      | "content"
      | "contentHash"
      | "createdAt"
      | "embedding"
      | "originMessageIds"
      | "originThreadId"
      | "ragKey"
      | "source"
      | "tags"
      | "title"
      | "updatedAt"
      | "userId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_user: ["userId", "_creationTime"];
      by_user_contentHash: ["userId", "contentHash", "_creationTime"];
      by_user_updated: ["userId", "updatedAt", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  users: {
    document: {
      clerkUserId?: string;
      email?: string;
      emailVerificationTime?: number;
      image?: string;
      isAnonymous?: boolean;
      name?: string;
      phone?: string;
      phoneVerificationTime?: number;
      tokenIdentifier?: string;
      _id: Id<"users">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "clerkUserId"
      | "email"
      | "emailVerificationTime"
      | "image"
      | "isAnonymous"
      | "name"
      | "phone"
      | "phoneVerificationTime"
      | "tokenIdentifier";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_tokenIdentifier: ["tokenIdentifier", "_creationTime"];
      clerkUserId: ["clerkUserId", "_creationTime"];
      email: ["email", "_creationTime"];
      phone: ["phone", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  userSettings: {
    document: {
      bio?: string;
      displayName?: string;
      image?: string;
      updatedAt: number;
      userId: Id<"users">;
      _id: Id<"userSettings">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "bio"
      | "displayName"
      | "image"
      | "updatedAt"
      | "userId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_user: ["userId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
};

/**
 * The names of all of your Convex tables.
 */
export type TableNames = TableNamesInDataModel<DataModel>;

/**
 * The type of a document stored in Convex.
 *
 * @typeParam TableName - A string literal type of the table name (like "users").
 */
export type Doc<TableName extends TableNames> = DocumentByName<
  DataModel,
  TableName
>;

/**
 * An identifier for a document in Convex.
 *
 * Convex documents are uniquely identified by their `Id`, which is accessible
 * on the `_id` field. To learn more, see [Document IDs](https://docs.convex.dev/using/document-ids).
 *
 * Documents can be loaded using `db.get(tableName, id)` in query and mutation functions.
 *
 * IDs are just strings at runtime, but this type can be used to distinguish them from other
 * strings when type checking.
 *
 * @typeParam TableName - A string literal type of the table name (like "users").
 */
export type Id<TableName extends TableNames | SystemTableNames> =
  GenericId<TableName>;
