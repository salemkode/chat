import { api } from "@convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { useAction } from "convex/react";
import { useEffect, useRef, useState } from "react";

export type SidebarSearchResult = FunctionReturnType<
  typeof api.sidebarSearch.searchSidebar
>[number];

export function useSidebarSearch(active: boolean) {
  const searchSidebar = useAction(api.sidebarSearch.searchSidebar);
  const [query, setQuery] = useState("");
  const [deferredQuery, setDeferredQuery] = useState("");
  const [results, setResults] = useState<SidebarSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const requestIdRef = useRef(0);

  const reset = () => {
    setQuery("");
    setDeferredQuery("");
    setResults([]);
    setError(null);
    setIsSearching(false);
    requestIdRef.current += 1;
  };

  useEffect(() => {
    if (!active) {
      reset();
    }
  }, [active]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDeferredQuery(query);
    }, 180);
    return () => clearTimeout(timeoutId);
  }, [query]);

  useEffect(() => {
    if (!active) {
      return;
    }

    const trimmed = deferredQuery.trim();
    if (!trimmed) {
      setResults([]);
      setError(null);
      setIsSearching(false);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsSearching(true);
    setError(null);

    void searchSidebar({ query: trimmed, limit: 8 })
      .then((nextResults) => {
        if (requestIdRef.current !== requestId) {
          return;
        }
        setResults(nextResults);
        setIsSearching(false);
      })
      .catch((err: unknown) => {
        if (requestIdRef.current !== requestId) {
          return;
        }
        setResults([]);
        setError(err instanceof Error ? err.message : "Search failed");
        setIsSearching(false);
      });
  }, [active, deferredQuery, searchSidebar]);

  return {
    query,
    setQuery,
    results,
    error,
    isSearching,
    reset,
  };
}
