import { useCallback, useEffect, useState } from "react";

import type {
  DiffMode,
  RecentProject,
  UpdatePreferencesRequest,
} from "../shared/api";
import { loadAppState, updatePreferences } from "./api";
import { CodeViewWrapper } from "./components/code-view";
import { Header } from "./components/header";
import { Sidebar } from "./components/sidebar";
import { StatusPanel } from "./components/status-panel";
import { useDiffSession } from "./data/use-diff-session";
import { useProject } from "./data/use-project";
import type { DiffStyle, OverflowMode } from "./types";

type AppBootstrap = {
  diffStyle: DiffStyle;
  initialPath: string | undefined;
  mode: DiffMode;
  overflow: OverflowMode;
  recentProjects: readonly RecentProject[];
};

const DEFAULT_BOOTSTRAP: AppBootstrap = {
  diffStyle: "split",
  initialPath: undefined,
  mode: "combined",
  overflow: "scroll",
  recentProjects: [],
};

export function App() {
  const [bootstrap, setBootstrap] = useState<AppBootstrap | null>(null);

  useEffect(() => {
    let mounted = true;
    loadAppState()
      .then((state) => {
        if (!mounted) {
          return;
        }
        setBootstrap({
          diffStyle: state.preferences.diffStyle,
          initialPath: state.preferences.lastProjectPath,
          mode: state.preferences.selectedMode,
          overflow: state.preferences.overflow,
          recentProjects: state.recentProjects,
        });
      })
      .catch(() => {
        if (mounted) {
          setBootstrap(DEFAULT_BOOTSTRAP);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (bootstrap == null) {
    return <div className="h-svh bg-background" />;
  }
  return <AppShell bootstrap={bootstrap} />;
}

type AppShellProps = {
  bootstrap: AppBootstrap;
};

function AppShell({ bootstrap }: AppShellProps) {
  const project = useProject({
    initialPath: bootstrap.initialPath,
    initialRecentProjects: bootstrap.recentProjects,
  });
  const [mode, setMode] = useState<DiffMode>(bootstrap.mode);
  const [diffStyle, setDiffStyle] = useState<DiffStyle>(bootstrap.diffStyle);
  const [overflow, setOverflow] = useState<OverflowMode>(bootstrap.overflow);
  const [selectedBranch, setSelectedBranch] = useState<string | undefined>();
  const [selectedCommit, setSelectedCommit] = useState<string | undefined>();

  const repoRoot = project.project?.repoRoot;
  // biome-ignore lint/correctness/useExhaustiveDependencies: repoRoot is an intentional trigger — reset selections when the open repo changes.
  useEffect(() => {
    setSelectedBranch(undefined);
    setSelectedCommit(undefined);
  }, [repoRoot]);

  useEffect(() => {
    if (project.project == null) {
      return;
    }
    const summary = project.project;
    setSelectedBranch((current) => {
      if (
        current != null &&
        project.branches.some((branch) => branch.name === current)
      ) {
        return current;
      }
      return summary.currentBranch ?? summary.defaultBranch.ref;
    });
    setSelectedCommit((current) => {
      if (
        current != null &&
        project.commits.some((commit) => commit.hash === current)
      ) {
        return current;
      }
      return project.commits[0]?.hash;
    });
  }, [project.branches, project.commits, project.project]);

  const session = useDiffSession({
    branch: selectedBranch,
    commit: selectedCommit,
    enabled: project.project != null,
    mode,
    path: project.project?.repoRoot ?? "",
  });

  const persist = useCallback((next: UpdatePreferencesRequest) => {
    updatePreferences(next).catch(() => undefined);
  }, []);

  const handleChangeMode = useCallback(
    (next: DiffMode) => {
      setMode((current) => {
        if (current === next) {
          return current;
        }
        persist({ selectedMode: next });
        return next;
      });
    },
    [persist]
  );

  const handleChangeDiffStyle = useCallback(
    (next: DiffStyle) => {
      setDiffStyle(next);
      persist({ diffStyle: next });
    },
    [persist]
  );

  const handleChangeOverflow = useCallback(
    (next: OverflowMode) => {
      setOverflow(next);
      persist({ overflow: next });
    },
    [persist]
  );

  const handleSelectBranch = useCallback(
    (next: string) => {
      setSelectedBranch(next);
      handleChangeMode("branch");
    },
    [handleChangeMode]
  );

  const handleSelectCommit = useCallback(
    (next: string) => {
      setSelectedCommit(next);
      handleChangeMode("commit");
    },
    [handleChangeMode]
  );

  const handleOpenProject = useCallback(
    (path: string) => {
      project.open(path).catch(() => undefined);
    },
    [project]
  );

  const handleSelectPath = useCallback(
    (itemId: string) => {
      const viewer = session.viewerRef.current;
      if (viewer == null) {
        return;
      }
      const item = viewer.getItem(itemId);
      if (item != null && item.type === "diff" && item.collapsed === true) {
        item.collapsed = false;
        item.version =
          (typeof item.version === "number" ? item.version : 0) + 1;
        viewer.updateItem(item);
      }
      viewer.scrollTo({
        align: "start",
        behavior: "smooth",
        id: itemId,
        type: "item",
      });
    },
    [session.viewerRef]
  );

  const errorBanner = project.error ?? session.error;
  const showViewer =
    project.project != null &&
    (session.loadState === "ready" || session.loadState === "streaming") &&
    session.items.length > 0;

  return (
    <div className="grid h-svh grid-rows-[auto_auto_minmax(0,1fr)] bg-background text-foreground">
      <Header
        branches={project.branches}
        commits={project.commits}
        diffStyle={diffStyle}
        mode={mode}
        onChangeDiffStyle={handleChangeDiffStyle}
        onChangeMode={handleChangeMode}
        onChangeOverflow={handleChangeOverflow}
        onOpenProject={handleOpenProject}
        onReload={session.reload}
        onSelectBranch={handleSelectBranch}
        onSelectCommit={handleSelectCommit}
        overflow={overflow}
        project={project.project}
        recentProjects={project.recentProjects}
        selectedBranch={selectedBranch}
        selectedCommit={selectedCommit}
        worktrees={project.worktrees}
      />
      {errorBanner == null ? (
        <span aria-hidden />
      ) : (
        <div
          className="border-b border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs text-destructive"
          role="alert"
        >
          {errorBanner}
        </div>
      )}
      <div className="grid min-h-0 grid-cols-[280px_minmax(0,1fr)]">
        <Sidebar
          loadState={session.loadState}
          onSelectPath={handleSelectPath}
          stats={session.stats}
          treeSource={session.treeSource}
        />
        <main aria-label="Diff viewer" className="min-h-0 min-w-0">
          {showViewer ? (
            <CodeViewWrapper
              diffStyle={diffStyle}
              items={session.items}
              overflow={overflow}
              viewerKey={session.viewerKey}
              viewerRef={session.viewerRef}
            />
          ) : (
            <StatusPanel
              errorMessage={session.error}
              onRetry={session.reload}
              state={session.loadState}
            />
          )}
        </main>
      </div>
    </div>
  );
}
