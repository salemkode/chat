import { createContext, use, useCallback, useMemo, useState } from "react";

type ChatComposerOptionsContextValue = {
  searchEnabled: boolean;
  setSearchEnabled: (value: boolean) => void;
};

const ChatComposerOptionsContext =
  createContext<ChatComposerOptionsContextValue | null>(null);

export function ChatComposerOptionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [searchEnabled, setSearchEnabledState] = useState(false);

  const setSearchEnabled = useCallback((value: boolean) => {
    setSearchEnabledState(value);
  }, []);

  const value = useMemo(
    () => ({
      searchEnabled,
      setSearchEnabled,
    }),
    [searchEnabled, setSearchEnabled],
  );

  return (
    <ChatComposerOptionsContext value={value}>
      {children}
    </ChatComposerOptionsContext>
  );
}

export function useChatComposerOptions() {
  const context = use(ChatComposerOptionsContext);
  if (!context) {
    throw new Error(
      "useChatComposerOptions must be used within <ChatComposerOptionsProvider>",
    );
  }
  return context;
}
