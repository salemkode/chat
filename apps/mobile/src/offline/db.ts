import * as SQLite from 'expo-sqlite'

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null

const CACHE_TABLE_SCHEMAS = {
  models: `
    CREATE TABLE models (
      id TEXT PRIMARY KEY NOT NULL,
      json TEXT NOT NULL,
      sortOrder INTEGER NOT NULL
    )
  `,
  modelCollections: `
    CREATE TABLE modelCollections (
      id TEXT PRIMARY KEY NOT NULL,
      json TEXT NOT NULL,
      sortOrder INTEGER NOT NULL
    )
  `,
  projects: `
    CREATE TABLE projects (
      id TEXT PRIMARY KEY NOT NULL,
      json TEXT NOT NULL,
      updatedAt INTEGER NOT NULL
    )
  `,
} as const

async function getTableColumns(db: SQLite.SQLiteDatabase, tableName: string) {
  const rows = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(${tableName})`,
  )
  return rows.map((row) => row.name)
}

async function ensureCompatibleCacheTable(
  db: SQLite.SQLiteDatabase,
  tableName: keyof typeof CACHE_TABLE_SCHEMAS,
  expectedColumns: string[],
) {
  const actualColumns = await getTableColumns(db, tableName)
  if (!actualColumns.length) {
    return
  }

  const hasExpectedShape =
    actualColumns.length === expectedColumns.length &&
    expectedColumns.every((column, index) => actualColumns[index] === column)

  if (hasExpectedShape) {
    return
  }

  await db.execAsync(`
    DROP TABLE IF EXISTS ${tableName};
    ${CACHE_TABLE_SCHEMAS[tableName]};
  `)
}

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
    CREATE TABLE IF NOT EXISTS modelCollections (
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

  // Older app builds stored user-scoped cache rows. Rebuild stale cache tables
  // so current inserts do not fail against mismatched NOT NULL columns.
  await ensureCompatibleCacheTable(db, 'models', ['id', 'json', 'sortOrder'])
  await ensureCompatibleCacheTable(db, 'modelCollections', [
    'id',
    'json',
    'sortOrder',
  ])
  await ensureCompatibleCacheTable(db, 'projects', ['id', 'json', 'updatedAt'])
}

export async function getOfflineDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('chat-mobile-cache.db').then(
      async (db) => {
        await ensureSchema(db)
        return db
      },
    )
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
    DELETE FROM modelCollections;
    DELETE FROM projects;
    DELETE FROM settings;
    DELETE FROM drafts;
  `)
}
