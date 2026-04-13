import * as SQLite from 'expo-sqlite'

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null

async function ensureSchema(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS session (
      id TEXT PRIMARY KEY NOT NULL,
      json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS threads (
      id TEXT PRIMARY KEY NOT NULL,
      json TEXT NOT NULL,
      updatedAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY NOT NULL,
      threadId TEXT NOT NULL,
      json TEXT NOT NULL,
      createdAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS models (
      id TEXT PRIMARY KEY NOT NULL,
      json TEXT NOT NULL,
      sortOrder INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY NOT NULL,
      json TEXT NOT NULL,
      updatedAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY NOT NULL,
      json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS drafts (
      threadId TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL,
      updatedAt INTEGER NOT NULL
    );
  `)
}

export async function getOfflineDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('chat-mobile-cache.db').then(async (db) => {
      await ensureSchema(db)
      return db
    })
  }
  return await dbPromise
}

export async function clearOfflineDb() {
  const db = await getOfflineDb()
  await db.execAsync(`
    DELETE FROM session;
    DELETE FROM threads;
    DELETE FROM messages;
    DELETE FROM models;
    DELETE FROM projects;
    DELETE FROM settings;
    DELETE FROM drafts;
  `)
}
