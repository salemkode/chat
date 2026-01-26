import type { BetterOmit, Expand } from "convex-helpers";
import type { FunctionArgs, FunctionReference } from "convex/server";
import type { SyncStreamsReturnValue } from "../lib/agent/types";
import type { StreamArgs } from "../lib/agent/validators";

export type StreamQuery<Args = Record<string, unknown>> = FunctionReference<
  "query",
  "public",
  {
    threadId: string;
    streamArgs?: StreamArgs;
  } & Args,
  { streams: SyncStreamsReturnValue }
>;

export type StreamQueryArgs<Query extends StreamQuery<unknown>> =
  Query extends StreamQuery<unknown>
    ? Expand<BetterOmit<FunctionArgs<Query>, "streamArgs">>
    : never;
