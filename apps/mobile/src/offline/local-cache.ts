import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_NS = "salemkode-chat";
const SCHEMA_VERSION = 1;

const memory = new Map<string, string>();
let cacheVersion = 0;
const listeners = new Set<() => void>();

let hydratePromise: Promise<void> | null = null;

export function subscribeOfflineCache(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function getOfflineCacheVersion() {
  return cacheVersion;
}

function notifyOfflineCacheUpdate() {
  cacheVersion += 1;
  for (const listener of listeners) {
    listener();
  }
}

function userKey(userId: string, suffix: string) {
  return `${STORAGE_NS}:v${SCHEMA_VERSION}:u:${userId}:${suffix}`;
}

function readJson<T>(raw: string | null | undefined): T | null {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function persistKey(key: string, value: string | null) {
  if (value === null) {
    memory.delete(key);
    await AsyncStorage.removeItem(key);
    return;
  }
  memory.set(key, value);
  await AsyncStorage.setItem(key, value);
}

const SESSION_STORAGE_KEY = `${STORAGE_NS}:v${SCHEMA_VERSION}:session`;

export type OfflineSessionSnapshot = {
  id: "current";
  userId: string;
  trusted: boolean;
};

export async function hydrateOfflineCache() {
  if (hydratePromise) {
    return hydratePromise;
  }

  hydratePromise = (async () => {
    const keys = await AsyncStorage.getAllKeys();
    const relevant = keys.filter((key) => key.startsWith(STORAGE_NS));
    if (relevant.length === 0) {
      return;
    }
    const pairs = await AsyncStorage.multiGet(relevant);
    for (const [key, value] of pairs) {
      if (key && value) {
        memory.set(key, value);
      }
    }
    notifyOfflineCacheUpdate();
  })();

  return hydratePromise;
}

void hydrateOfflineCache();

export function readSession(): OfflineSessionSnapshot | null {
  const parsed = readJson<OfflineSessionSnapshot>(memory.get(SESSION_STORAGE_KEY));
  if (!parsed || typeof parsed.userId !== "string" || !parsed.trusted) {
    return null;
  }
  return parsed;
}

export async function storeTrustedSession(
  session: Omit<OfflineSessionSnapshot, "id">,
) {
  const payload: OfflineSessionSnapshot = {
    id: "current",
    ...session,
  };
  const serialized = JSON.stringify(payload);
  await persistKey(SESSION_STORAGE_KEY, serialized);
  notifyOfflineCacheUpdate();
}

export function readThreadsCache<T>(userId: string): T | null {
  return readJson<T>(memory.get(userKey(userId, "threads")));
}

export async function writeThreadsCache(userId: string, threads: unknown) {
  const key = userKey(userId, "threads");
  const serialized = JSON.stringify(threads);
  await persistKey(key, serialized);
  notifyOfflineCacheUpdate();
}

export function readProjectsCache<T>(userId: string): T | null {
  return readJson<T>(memory.get(userKey(userId, "projects")));
}

export async function writeProjectsCache(userId: string, projects: unknown) {
  const key = userKey(userId, "projects");
  const serialized = JSON.stringify(projects);
  await persistKey(key, serialized);
  notifyOfflineCacheUpdate();
}

export function readMessagesCache<T>(userId: string, threadId: string): T | null {
  return readJson<T>(memory.get(userKey(userId, `messages:${threadId}`)));
}

export async function writeMessagesCache(
  userId: string,
  threadId: string,
  messages: unknown,
) {
  const key = userKey(userId, `messages:${threadId}`);
  const serialized = JSON.stringify(messages);
  await persistKey(key, serialized);
  notifyOfflineCacheUpdate();
}

export async function clearLocalOfflineCache() {
  const keys = [...memory.keys()].filter((key) => key.startsWith(STORAGE_NS));
  memory.clear();
  if (keys.length > 0) {
    await AsyncStorage.multiRemove(keys);
  }
  notifyOfflineCacheUpdate();
}
