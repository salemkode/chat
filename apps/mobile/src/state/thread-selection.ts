import { observable } from "@legendapp/state";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const threadSelection$ = observable<{
  selectedThreadId: string | undefined;
}>({
  selectedThreadId: undefined,
});

const STORAGE_KEY = "chat.selectedThreadId";
let hydrated = false;

export function selectThread(threadId: string | undefined) {
  threadSelection$.selectedThreadId.set(threadId);
  void persistSelectedThreadId(threadId);
}

async function persistSelectedThreadId(threadId: string | undefined) {
  try {
    if (threadId) {
      await AsyncStorage.setItem(STORAGE_KEY, threadId);
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore persistence failures; in-memory state remains authoritative.
  }
}

export async function hydrateThreadSelection() {
  if (hydrated) return;
  hydrated = true;
  try {
    const threadId = await AsyncStorage.getItem(STORAGE_KEY);
    threadSelection$.selectedThreadId.set(threadId || undefined);
  } catch {
    // Ignore hydration failures.
  }
}
