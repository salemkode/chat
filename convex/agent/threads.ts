import { assert, omit } from "convex-helpers";
import { paginator } from "convex-helpers/server/pagination";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "../_generated/dataModel.js";
import { mutation, query } from "../_generated/server.js";

// Simplified ThreadDoc type for our use case
export interface ThreadDoc {
  _id: Id<"threads">;
  _creationTime: number;
  userId: Id<"users">;
  title?: string;
  summary?: string;
  status: "active" | "archived";
  sectionId?: Id<"sections">;
  emoji?: string;
}

function publicThread(thread: Doc<"threads">): ThreadDoc {
  return omit(thread, ["defaultSystemPrompt", "parentThreadIds", "order"]) as ThreadDoc;
}

// Get a single thread by ID (with auth check)
export const getThread = query({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const thread = await ctx.db.get("threads", args.threadId);
    if (!thread || thread.userId !== userId) {
      return null;
    }
    return publicThread(thread);
  },
  returns: v.union(v.object({
    _id: v.id("threads"),
    _creationTime: v.number(),
    userId: v.id("users"),
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("archived")),
    sectionId: v.optional(v.id("sections")),
    emoji: v.optional(v.string()),
  }), v.null()),
});

// List threads for the current user
export const listThreads = query({
  args: {
    paginationOpts: v.optional(paginationOptsValidator),
    sectionId: v.optional(v.id("sections")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { page: [], isDone: true, continueCursor: "" };

    let query = ctx.db.query("threads").withIndex("by_userId", (q) => q.eq("userId", userId));

    // Filter by section if provided
    if (args.sectionId !== undefined) {
      query = query.filter((q) => q.eq(q.field("sectionId"), args.sectionId));
    }

    const threads = await paginator(ctx.db)
      .query("threads")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .paginate(args.paginationOpts ?? { cursor: null, numItems: 50 });

    return {
      ...threads,
      page: threads.page.map(publicThread),
    };
  },
  returns: v.object({
    page: v.array(v.object({
      _id: v.id("threads"),
      _creationTime: v.number(),
      userId: v.id("users"),
      title: v.optional(v.string()),
      summary: v.optional(v.string()),
      status: v.union(v.literal("active"), v.literal("archived")),
      sectionId: v.optional(v.id("sections")),
      emoji: v.optional(v.string()),
    })),
    continueCursor: v.string(),
    isDone: v.boolean(),
    splitCursor: v.optional(v.union(v.string(), v.null())),
    pageStatus: v.optional(v.union(v.literal("SplitRecommended"), v.literal("SplitRequired"), v.null())),
  }),
});

// Create a new thread for the current user
export const createThread = mutation({
  args: {
    title: v.optional(v.string()),
    sectionId: v.optional(v.id("sections")),
    emoji: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const threadId = await ctx.db.insert("threads", {
      userId,
      title: args.title,
      sectionId: args.sectionId,
      emoji: args.emoji,
      status: "active",
    });
    return publicThread((await ctx.db.get("threads", threadId))!);
  },
  returns: v.object({
    _id: v.id("threads"),
    _creationTime: v.number(),
    userId: v.id("users"),
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("archived")),
    sectionId: v.optional(v.id("sections")),
    emoji: v.optional(v.string()),
  }),
});

// Update thread metadata (title, section, emoji, etc.)
export const updateThread = mutation({
  args: {
    threadId: v.id("threads"),
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
    sectionId: v.optional(v.id("sections")),
    emoji: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("archived"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const thread = await ctx.db.get("threads", args.threadId);
    assert(thread, `Thread ${args.threadId} not found`);

    // Check ownership
    if (thread.userId !== userId) {
      throw new Error("Thread not found");
    }

    const { threadId, ...updates } = args;
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined),
    );

    await ctx.db.patch("threads", threadId, cleanUpdates);
    return publicThread((await ctx.db.get("threads", threadId))!);
  },
  returns: v.object({
    _id: v.id("threads"),
    _creationTime: v.number(),
    userId: v.id("users"),
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("archived")),
    sectionId: v.optional(v.id("sections")),
    emoji: v.optional(v.string()),
  }),
});

// Delete a thread and all its messages
export const deleteThread = mutation({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const thread = await ctx.db.get("threads", args.threadId);
    if (!thread || thread.userId !== userId) {
      throw new Error("Thread not found");
    }

    // Delete all messages in the thread
    const messages = await ctx.db
      .query("messages")
      .withIndex("threadId_status_tool_order_stepOrder", (q) => q.eq("threadId", args.threadId))
      .collect();

    for (const message of messages) {
      await ctx.db.delete("messages", message._id);
    }

    // Delete the thread
    await ctx.db.delete("threads", args.threadId);
  },
  returns: v.null(),
});

// Search thread titles
export const searchThreadTitles = query({
  args: {
    query: v.string(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const threads = await ctx.db
      .query("threads")
      .withSearchIndex("title", (q) =>
        q.search("title", args.query).eq("userId", userId),
      )
      .take(args.limit);

    return threads.map(publicThread);
  },
  returns: v.array(v.object({
    _id: v.id("threads"),
    _creationTime: v.number(),
    userId: v.id("users"),
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("archived")),
    sectionId: v.optional(v.id("sections")),
    emoji: v.optional(v.string()),
  })),
});
