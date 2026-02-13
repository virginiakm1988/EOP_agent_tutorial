"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import type { Provider, ApiKeys, ChatMessage } from "./types";

interface AppState {
  apiKeys: ApiKeys;
  provider: Provider;
  model: string;
  messages: ChatMessage[];
  isLoading: boolean;
}

interface AppContextValue extends AppState {
  setApiKey: (provider: Provider, key: string) => void;
  setProvider: (provider: Provider) => void;
  setModel: (model: string) => void;
  addMessage: (msg: ChatMessage) => void;
  setMessages: (msgs: ChatMessage[]) => void;
  setIsLoading: (loading: boolean) => void;
  clearMessages: () => void;
  currentApiKey: () => string | undefined;
  isConfigured: () => boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [apiKeys, setApiKeys] = useState<ApiKeys>({});
  const [provider, setProviderState] = useState<Provider>("openai");
  const [model, setModelState] = useState<string>("");
  const [messages, setMessagesState] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const setApiKey = useCallback((p: Provider, key: string) => {
    setApiKeys((prev) => ({ ...prev, [p]: key }));
  }, []);

  const setProvider = useCallback((p: Provider) => {
    setProviderState(p);
    setModelState(""); // reset model when provider changes
  }, []);

  const setModel = useCallback((m: string) => {
    setModelState(m);
  }, []);

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessagesState((prev) => [...prev, msg]);
  }, []);

  const setMessages = useCallback((msgs: ChatMessage[]) => {
    setMessagesState(msgs);
  }, []);

  const clearMessages = useCallback(() => {
    setMessagesState([]);
  }, []);

  const currentApiKey = useCallback(() => {
    return apiKeys[provider];
  }, [apiKeys, provider]);

  const isConfigured = useCallback(() => {
    const key = apiKeys[provider];
    return !!key && key.trim().length > 0;
  }, [apiKeys, provider]);

  return (
    <AppContext.Provider
      value={{
        apiKeys,
        provider,
        model,
        messages,
        isLoading,
        setApiKey,
        setProvider,
        setModel,
        addMessage,
        setMessages,
        setIsLoading,
        clearMessages,
        currentApiKey,
        isConfigured,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
}
