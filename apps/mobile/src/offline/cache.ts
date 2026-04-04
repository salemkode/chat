import { getOfflineDb } from './db'
import type {
  MobileOfflineMessageRecord,
  MobileOfflineModelRecord,
  MobileOfflineProjectRecord,
  MobileOfflineSessionSnapshot,
  MobileOfflineSettingsRecord,
  MobileOfflineThreadRecord,
} from './types'

function toJson<T>(value: T) {
  return JSON.stringify(value)
}

function fromJson<T>(value: string): T {
  return JSON.parse(value) as T
}

export async function cacheSession(snapshot: MobileOfflineSessionSnapshot) {
  const db = await getOfflineDb()
  await db.runAsync(
    'INSERT OR REPLACE INTO session (id, json) VALUES (?, ?)',
    snapshot.id,
    toJson(snapshot),
  )
}

export async function readSession() {
  const db = await getOfflineDb()
  const row = await db.getFirstAsync<{ json: string }>(
    'SELECT json FROM session WHERE id = ?',
    'current',
  )
  return row ? fromJson<MobileOfflineSessionSnapshot>(row.json) : null
}

export async function cacheThreads(threads: MobileOfflineThreadRecord[]) {
  const db = await getOfflineDb()
  await db.execAsync('DELETE FROM threads')
  for (const thread of threads) {
    await db.runAsync(
      'INSERT OR REPLACE INTO threads (id, json, updatedAt) VALUES (?, ?, ?)',
      thread.id,
      toJson(thread),
      thread.updatedAt,
    )
  }
}

export async function readThreads() {
  const db = await getOfflineDb()
  const rows = await db.getAllAsync<{ json: string }>(
    'SELECT json FROM threads ORDER BY updatedAt DESC',
  )
  return rows.map((row) => fromJson<MobileOfflineThreadRecord>(row.json))
}

export async function cacheMessages(
  threadId: string,
  messages: MobileOfflineMessageRecord[],
) {
  const db = await getOfflineDb()
  await db.runAsync('DELETE FROM messages WHERE threadId = ?', threadId)
  for (const message of messages) {
    await db.runAsync(
      'INSERT OR REPLACE INTO messages (id, threadId, json, createdAt) VALUES (?, ?, ?, ?)',
      message.id,
      message.threadId,
      toJson(message),
      message.createdAt,
    )
  }
}

export async function readMessages(threadId: string) {
  const db = await getOfflineDb()
  const rows = await db.getAllAsync<{ json: string }>(
    'SELECT json FROM messages WHERE threadId = ? ORDER BY createdAt ASC',
    threadId,
  )
  return rows.map((row) => fromJson<MobileOfflineMessageRecord>(row.json))
}

export async function cacheModels(models: MobileOfflineModelRecord[]) {
  const db = await getOfflineDb()
  await db.execAsync('DELETE FROM models')
  for (const model of models) {
    await db.runAsync(
      'INSERT OR REPLACE INTO models (id, json, sortOrder) VALUES (?, ?, ?)',
      model.id,
      toJson(model),
      model.sortOrder,
    )
  }
}

export async function readModels() {
  const db = await getOfflineDb()
  const rows = await db.getAllAsync<{ json: string }>(
    'SELECT json FROM models ORDER BY sortOrder ASC',
  )
  return rows.map((row) => fromJson<MobileOfflineModelRecord>(row.json))
}

export async function cacheProjects(projects: MobileOfflineProjectRecord[]) {
  const db = await getOfflineDb()
  await db.execAsync('DELETE FROM projects')
  for (const project of projects) {
    await db.runAsync(
      'INSERT OR REPLACE INTO projects (id, json, updatedAt) VALUES (?, ?, ?)',
      project.id,
      toJson(project),
      project.updatedAt,
    )
  }
}

export async function readProjects() {
  const db = await getOfflineDb()
  const rows = await db.getAllAsync<{ json: string }>(
    'SELECT json FROM projects ORDER BY updatedAt DESC',
  )
  return rows.map((row) => fromJson<MobileOfflineProjectRecord>(row.json))
}

export async function cacheSettings(settings: MobileOfflineSettingsRecord) {
  const db = await getOfflineDb()
  await db.runAsync(
    'INSERT OR REPLACE INTO settings (id, json) VALUES (?, ?)',
    'current',
    toJson(settings),
  )
}

export async function readSettings() {
  const db = await getOfflineDb()
  const row = await db.getFirstAsync<{ json: string }>(
    'SELECT json FROM settings WHERE id = ?',
    'current',
  )
  return row ? fromJson<MobileOfflineSettingsRecord>(row.json) : null
}

export async function writeDraft(threadId: string, value: string) {
  const db = await getOfflineDb()
  if (!value) {
    await db.runAsync('DELETE FROM drafts WHERE threadId = ?', threadId)
    return
  }
  await db.runAsync(
    'INSERT OR REPLACE INTO drafts (threadId, value, updatedAt) VALUES (?, ?, ?)',
    threadId,
    value,
    Date.now(),
  )
}

export async function readDraft(threadId: string) {
  const db = await getOfflineDb()
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM drafts WHERE threadId = ?',
    threadId,
  )
  return row?.value ?? ''
}
