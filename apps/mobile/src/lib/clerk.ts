import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "__clerk_client_jwt";

export const tokenCache = {
  async getToken(key: string) {
    try {
      return SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, token: string) {
    try {
      return SecureStore.setItemAsync(key, token);
    } catch {
      return;
    }
  },
};
