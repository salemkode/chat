import type { Value } from "convex/values";
import type { FunctionReturnType } from "convex/server";
import type { OptimisticLocalStore } from "convex/browser";
import { insertAtPosition } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  buildOptimisticUserRow,
  maxOrderFromMessages,
  nextOrderAfterMax,
} from "@chat/shared/logic/optimistic-list-messages-core";

type ListMessagesPageItem = FunctionReturnType<
  typeof api.chat.listMessages
>["page"][number];

export function applyOptimisticGenerateMessage(
  localStore: OptimisticLocalStore,
  threadId: string,
  prompt: string,
  attachments?: Array<{
    filename?: string;
    mediaType?: string;
  }>,
  clientRequestId?: string,
) {
  const now = Date.now();
  const queries = localStore.getAllQueries(api.chat.listMessages);
  const orders: number[] = [];

  for (const query of queries) {
    if (query.args.threadId !== threadId || query.args.streamArgs) {
      continue;
    }
    for (const message of query.value?.page ?? []) {
      orders.push(message.order);
    }
  }

  const order = nextOrderAfterMax(maxOrderFromMessages(orders.map((o) => ({ order: o }))));
  const user = buildOptimisticUserRow({
    threadId,
    prompt,
    order,
    now,
    clientRequestId,
    attachments: attachments?.map((attachment) => ({
      filename: attachment.filename,
      mediaType: attachment.mediaType ?? "application/octet-stream",
    })),
  }) as ListMessagesPageItem;

  insertAtPosition({
    localQueryStore: localStore,
    paginatedQuery: api.chat.listMessages,
    argsToMatch: { threadId },
    sortOrder: "desc",
    sortKeyFromItem: (el: ListMessagesPageItem): Value | Value[] => [el.order, el.stepOrder],
    item: user,
  });
}
