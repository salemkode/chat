export type SidebarThreadRow<TMetadata = { threadId: string } | null> = {
  _id: string
  _creationTime: number
  lastMessageAt: number
  title?: string
  userId?: string
  metadata: TMetadata
  project: {
    id: string
    name: string
    description?: string
  } | null
}

export type SidebarThreadSource = {
  _id: string
  _creationTime: number
  title?: string
  userId?: string
}

export function appendThreadsWithoutUsableMetadata<TMetadata>(args: {
  metadataRows: SidebarThreadRow<TMetadata>[]
  metadataThreadIds: Iterable<string>
  threads: SidebarThreadSource[]
}) {
  const rows: SidebarThreadRow<TMetadata | null>[] = [...args.metadataRows]
  const visibleThreadIds = new Set(args.metadataRows.map((row) => row._id))
  const metadataThreadIds = new Set(args.metadataThreadIds)

  for (const thread of args.threads) {
    if (visibleThreadIds.has(thread._id)) {
      continue
    }
    if (metadataThreadIds.has(thread._id)) {
      continue
    }

    rows.push({
      _id: thread._id,
      _creationTime: thread._creationTime,
      lastMessageAt: thread._creationTime,
      title: thread.title,
      userId: thread.userId,
      metadata: null,
      project: null,
    })
  }

  return rows
}
