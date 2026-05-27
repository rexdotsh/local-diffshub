import { useCallback, useEffect, useRef, useState } from "react";

import type {
  BranchSummary,
  CommitSummary,
  ProjectSummary,
  RecentProject,
  WorktreeSummary,
} from "../../shared/api";
import {
  apiUrl,
  loadAppState,
  loadBranches,
  loadCommits,
  loadWorktrees,
  openProject,
} from "../api";

const SSE_REFRESH_DEBOUNCE_MS = 250;

type ProjectLoadState = "idle" | "loading" | "ready" | "error";

export type ProjectState = {
  branches: BranchSummary[];
  commits: CommitSummary[];
  error: string | null;
  loadState: ProjectLoadState;
  open(path: string): Promise<void>;
  project: ProjectSummary | null;
  recentProjects: RecentProject[];
  worktrees: WorktreeSummary[];
};

type ProjectMetadata = {
  branches: BranchSummary[];
  commits: CommitSummary[];
  worktrees: WorktreeSummary[];
};

type ProjectInput = {
  initialPath: string | undefined;
  initialRecentProjects: readonly RecentProject[];
};

export function useProject({
  initialPath,
  initialRecentProjects,
}: ProjectInput): ProjectState {
  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [commits, setCommits] = useState<CommitSummary[]>([]);
  const [worktrees, setWorktrees] = useState<WorktreeSummary[]>([]);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>(() => [
    ...initialRecentProjects,
  ]);
  const [loadState, setLoadState] = useState<ProjectLoadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const repoRootRef = useRef<string | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchMetadata = useCallback(
    async (repoRoot: string): Promise<ProjectMetadata> => {
      const [nextBranches, nextCommits, nextWorktrees] = await Promise.all([
        loadBranches(repoRoot),
        loadCommits(repoRoot).catch(() => ({ commits: [] })),
        loadWorktrees(repoRoot),
      ]);
      return {
        branches: nextBranches.branches,
        commits: nextCommits.commits,
        worktrees: nextWorktrees.worktrees,
      };
    },
    []
  );

  const open = useCallback(
    async (nextPath: string): Promise<void> => {
      const requestId = ++requestIdRef.current;
      setLoadState("loading");
      setError(null);
      try {
        const summary = await openProject(nextPath);
        const metadata = await fetchMetadata(summary.repoRoot);
        if (requestId !== requestIdRef.current) {
          return;
        }
        repoRootRef.current = summary.repoRoot;
        setProject(summary);
        setBranches(metadata.branches);
        setCommits(metadata.commits);
        setWorktrees(metadata.worktrees);
        setLoadState("ready");
        loadAppState()
          .then((state) => {
            if (requestId === requestIdRef.current) {
              setRecentProjects(state.recentProjects);
            }
          })
          .catch(() => undefined);
      } catch (loadError) {
        if (requestId !== requestIdRef.current) {
          return;
        }
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to open project."
        );
        setLoadState("error");
      }
    },
    [fetchMetadata]
  );

  const quietRefresh = useCallback(async (): Promise<void> => {
    const target = repoRootRef.current;
    if (target == null) {
      return;
    }
    try {
      const metadata = await fetchMetadata(target);
      if (repoRootRef.current !== target) {
        return;
      }
      setBranches(metadata.branches);
      setCommits(metadata.commits);
      setWorktrees(metadata.worktrees);
    } catch {
      // Background refresh failures are non-fatal; surface only via SSE indicator.
    }
  }, [fetchMetadata]);

  useEffect(() => {
    if (initialPath == null) {
      return;
    }
    open(initialPath).catch(() => undefined);
  }, [initialPath, open]);

  const repoRoot = project?.repoRoot;
  useEffect(() => {
    if (repoRoot == null) {
      return;
    }
    const events = new EventSource(
      apiUrl(`/events/project?path=${encodeURIComponent(repoRoot)}`),
      { withCredentials: true }
    );
    const scheduleRefresh = () => {
      if (refreshTimerRef.current != null) {
        clearTimeout(refreshTimerRef.current);
      }
      refreshTimerRef.current = setTimeout(() => {
        refreshTimerRef.current = null;
        quietRefresh().catch(() => undefined);
      }, SSE_REFRESH_DEBOUNCE_MS);
    };
    const onChange = () => scheduleRefresh();
    const onError = () => {
      // Browsers auto-reconnect EventSource by default; nothing actionable here.
    };
    events.addEventListener("project-change", onChange);
    events.addEventListener("error", onError);
    return () => {
      events.removeEventListener("project-change", onChange);
      events.removeEventListener("error", onError);
      events.close();
      if (refreshTimerRef.current != null) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [quietRefresh, repoRoot]);

  return {
    branches,
    commits,
    error,
    loadState,
    open,
    project,
    recentProjects,
    worktrees,
  };
}
