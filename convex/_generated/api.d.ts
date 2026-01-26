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
import type * as agent_files from "../agent/files.js";
import type * as agent_functions from "../agent/functions.js";
import type * as agent_index from "../agent/index.js";
import type * as agent_messages from "../agent/messages.js";
import type * as agent_streams from "../agent/streams.js";
import type * as agent_threads from "../agent/threads.js";
import type * as agent_validators from "../agent/validators.js";
import type * as agent_vector_tables from "../agent/vector/tables.js";
import type * as agents from "../agents.js";
import type * as auth from "../auth.js";
import type * as chat from "../chat.js";
import type * as http from "../http.js";
import type * as lib_UIMessages from "../lib/UIMessages.js";
import type * as lib_deltas from "../lib/deltas.js";
import type * as messages from "../messages.js";
import type * as sections from "../sections.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  "agent/files": typeof agent_files;
  "agent/functions": typeof agent_functions;
  "agent/index": typeof agent_index;
  "agent/messages": typeof agent_messages;
  "agent/streams": typeof agent_streams;
  "agent/threads": typeof agent_threads;
  "agent/validators": typeof agent_validators;
  "agent/vector/tables": typeof agent_vector_tables;
  agents: typeof agents;
  auth: typeof auth;
  chat: typeof chat;
  http: typeof http;
  "lib/UIMessages": typeof lib_UIMessages;
  "lib/deltas": typeof lib_deltas;
  messages: typeof messages;
  sections: typeof sections;
  users: typeof users;
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
