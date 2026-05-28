import { useCallback, useEffect, useState } from "react";

import type { DirectoryListing } from "../../shared/api";
import { listDirectory } from "../api";

type DirectoryListingState = {
  listing: DirectoryListing | null;
  loadState: "idle" | "loading" | "ready" | "error";
  error: string | null;
};

export type UseDirectoryListing = DirectoryListingState & {
  navigate(path: string): void;
  reload(): void;
};

export function useDirectoryListing(initialPath = ""): UseDirectoryListing {
  const [path, setPath] = useState(initialPath);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [state, setState] = useState<DirectoryListingState>({
    error: null,
    listing: null,
    loadState: "idle",
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: reloadVersion gates a refetch.
  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, error: null, loadState: "loading" }));
    listDirectory(path)
      .then((listing) => {
        if (cancelled) return;
        setState({ error: null, listing, loadState: "ready" });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          error: error instanceof Error ? error.message : "Unable to read.",
          listing: null,
          loadState: "error",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [path, reloadVersion]);

  const navigate = useCallback((next: string) => {
    setPath(next);
  }, []);

  const reload = useCallback(() => {
    setReloadVersion((version) => version + 1);
  }, []);

  return { ...state, navigate, reload };
}
