import { useCallback, useEffect, useState } from "react";

import type { CommitSummary } from "../../shared/api";
import { loadCommits } from "../api";

export type BranchCommitsLoadState = "idle" | "loading" | "ready" | "error";

export type BranchCommitsState = {
  commits: readonly CommitSummary[];
  loadState: BranchCommitsLoadState;
  reload(): void;
};

export function useBranchCommits(
  repoRoot: string | undefined,
  branch: string | undefined,
  refreshKey = 0
): BranchCommitsState {
  const [commits, setCommits] = useState<readonly CommitSummary[]>([]);
  const [loadState, setLoadState] = useState<BranchCommitsLoadState>("idle");
  const [reloadVersion, setReloadVersion] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reloadVersion + refreshKey gate a refetch.
  useEffect(() => {
    if (repoRoot == null || branch == null) {
      setCommits([]);
      setLoadState("idle");
      return;
    }
    let cancelled = false;
    setLoadState("loading");
    loadCommits(repoRoot, branch)
      .then((response) => {
        if (cancelled) return;
        setCommits(response.commits);
        setLoadState("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setCommits([]);
        setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [repoRoot, branch, reloadVersion, refreshKey]);

  const reload = useCallback(() => {
    setReloadVersion((version) => version + 1);
  }, []);

  return { commits, loadState, reload };
}
