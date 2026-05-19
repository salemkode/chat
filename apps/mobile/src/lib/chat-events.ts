import { DeviceEventEmitter } from "react-native";

export const CHAT_STREAM_RESUME_EVENT = "chat-stream:resume";
export const CHAT_FOLLOW_LATEST_EVENT = "chat-follow-latest";

export function dispatchChatEvent(
  eventName: string,
  detail: { threadId?: string },
) {
  if (!detail.threadId) {
    return;
  }

  DeviceEventEmitter.emit(eventName, detail);
}
