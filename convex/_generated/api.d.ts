/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as agentMessages from "../agentMessages.js";
import type * as agentThreads from "../agentThreads.js";
import type * as agents from "../agents.js";
import type * as auth from "../auth.js";
import type * as chat from "../chat.js";
import type * as dynamicAgent from "../dynamicAgent.js";
import type * as dynamicModel from "../dynamicModel.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as memories from "../memories.js";
import type * as messages from "../messages.js";
import type * as migrations from "../migrations.js";
import type * as migrationsRunner from "../migrationsRunner.js";
import type * as modelRouter from "../modelRouter.js";
import type * as projects from "../projects.js";
import type * as resources from "../resources.js";
import type * as schemas from "../schemas.js";
import type * as sections from "../sections.js";
import type * as seed from "../seed.js";
import type * as shared from "../shared.js";
import type * as threadGeneration from "../threadGeneration.js";
import type * as threadMetadata from "../threadMetadata.js";
import type * as threads from "../threads.js";
import type * as uiMessages from "../uiMessages.js";
import type * as users from "../users.js";
import type * as validators from "../validators.js";
import type * as vector from "../vector.js";
import type * as vectorTables from "../vectorTables.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  agentMessages: typeof agentMessages;
  agentThreads: typeof agentThreads;
  agents: typeof agents;
  auth: typeof auth;
  chat: typeof chat;
  dynamicAgent: typeof dynamicAgent;
  dynamicModel: typeof dynamicModel;
  files: typeof files;
  http: typeof http;
  memories: typeof memories;
  messages: typeof messages;
  migrations: typeof migrations;
  migrationsRunner: typeof migrationsRunner;
  modelRouter: typeof modelRouter;
  projects: typeof projects;
  resources: typeof resources;
  schemas: typeof schemas;
  sections: typeof sections;
  seed: typeof seed;
  shared: typeof shared;
  threadGeneration: typeof threadGeneration;
  threadMetadata: typeof threadMetadata;
  threads: typeof threads;
  uiMessages: typeof uiMessages;
  users: typeof users;
  validators: typeof validators;
  vector: typeof vector;
  vectorTables: typeof vectorTables;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
