export function buildChatShareUrl(token: string) {
  const baseUrl = process.env.EXPO_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (!baseUrl) {
    return null;
  }

  return `${baseUrl}/share/${token}`;
}
