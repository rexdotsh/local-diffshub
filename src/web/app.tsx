import {
  lazy,
  Suspense,
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  BranchSummary,
  DiffMode,
  ProjectSummary,
  RecentProject,
  StatusSummary,
  UpdatePreferencesRequest,
  WorktreeSummary,
} from "../shared/api";
import {
  loadAppState,
  loadBranches,
  loadStatus,
  loadWorktrees,
  openProject,
  updatePreferences,
  apiUrl,
} from "./api";
import type { DiffStyle, OverflowMode } from "./diff-viewer";

type LoadState = "idle" | "loading" | "ready" | "error";

const DEFAULT_PATH = "/home/majdoor/diffs";
const DiffViewer = lazy(() =>
  import("./diff-viewer").then((module) => ({ default: module.DiffViewer }))
);

export function App() {
  const [path, setPath] = useState(DEFAULT_PATH);
  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [worktrees, setWorktrees] = useState<WorktreeSummary[]>([]);
  const [status, setStatus] = useState<StatusSummary | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<DiffMode>("combined");
  const [selectedBranch, setSelectedBranch] = useState<string | undefined>();
  const [diffStyle, setDiffStyle] = useState<DiffStyle>("split");
  const [overflow, setOverflow] = useState<OverflowMode>("scroll");
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [diffRefreshVersion, setDiffRefreshVersion] = useState(0);
  const requestIdRef = useRef(0);
  const preferenceWriteRef = useRef(Promise.resolve());
  const selectedProjectPath = project?.repoRoot;

  const persistPreferences = useCallback(
    (preferences: UpdatePreferencesRequest) => {
      preferenceWriteRef.current = preferenceWriteRef.current
        .then(() => updatePreferences(preferences))
        .then(
          () => undefined,
          () => undefined
        );
    },
    []
  );

  const refreshPersistedState = useCallback(
    async (applyPreferences = false) => {
      const state = await loadAppState();
      setRecentProjects(state.recentProjects);
      if (applyPreferences) {
        setSelectedMode(state.preferences.selectedMode);
        setDiffStyle(state.preferences.diffStyle);
        setOverflow(state.preferences.overflow);
      }
      if (state.preferences.lastProjectPath != null) {
        setPath(state.preferences.lastProjectPath);
      }
      return state;
    },
    []
  );

  const loadProject = useCallback(
    async (nextPath: string, preserveBranch = false): Promise<void> => {
      const requestId = ++requestIdRef.current;
      setLoadState("loading");
      setError(null);
      if (!preserveBranch) {
        setProject(null);
        setBranches([]);
        setWorktrees([]);
        setStatus(null);
      }
      try {
        const nextProject = await openProject(nextPath);
        const [nextBranches, nextWorktrees, nextStatus] = await Promise.all([
          loadBranches(nextProject.repoRoot),
          loadWorktrees(nextProject.repoRoot),
          loadStatus(nextProject.repoRoot),
        ]);

        if (requestId !== requestIdRef.current) {
          return;
        }

        startTransition(() => {
          setProject(nextProject);
          setPath(nextProject.repoRoot);
          setBranches(nextBranches.branches);
          setWorktrees(nextWorktrees.worktrees);
          setStatus(nextStatus.status);
          setDiffRefreshVersion((version) => version + 1);
          setSelectedBranch((current) => {
            if (
              preserveBranch &&
              current != null &&
              nextBranches.branches.some((branch) => branch.name === current)
            ) {
              return current;
            }
            return nextProject.currentBranch ?? nextProject.defaultBranch.ref;
          });
          setLoadState("ready");
        });
        refreshPersistedState(false).catch(() => undefined);
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
    [refreshPersistedState]
  );

  useEffect(() => {
    let mounted = true;
    refreshPersistedState(true)
      .then((state) => {
        if (!(mounted && state.preferences.lastProjectPath != null)) {
          return;
        }
        loadProject(state.preferences.lastProjectPath, true).catch(
          () => undefined
        );
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [loadProject, refreshPersistedState]);

  useEffect(() => {
    if (selectedProjectPath == null) {
      return;
    }

    const events = new EventSource(
      apiUrl(`/events/project?path=${encodeURIComponent(selectedProjectPath)}`),
      { withCredentials: true }
    );
    events.addEventListener("project-change", () => {
      loadProject(selectedProjectPath, true).catch(() => undefined);
    });
    return () => events.close();
  }, [loadProject, selectedProjectPath]);

  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top_left,var(--accent),transparent_26rem),var(--background)] text-foreground">
      <div className="grid min-h-svh grid-cols-1 lg:grid-cols-[22rem_1fr]">
        <aside className="border-border/80 border-r bg-sidebar/80 backdrop-blur">
          <div className="space-y-5 p-5">
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-[0.24em]">
                Local Diffhub
              </p>
              <h1 className="mt-2 font-semibold text-2xl tracking-tight">
                Read-only Git review
              </h1>
            </div>
            <form
              className="space-y-2"
              onSubmit={(event) => {
                event.preventDefault();
                loadProject(path).catch(() => undefined);
              }}
            >
              <Input
                aria-label="Project path"
                value={path}
                onChange={(event) => setPath(event.target.value)}
                placeholder="/path/to/project"
              />
              <Button
                className="w-full"
                disabled={loadState === "loading"}
                type="submit"
              >
                {loadState === "loading" ? "Opening..." : "Open project"}
              </Button>
            </form>
            {error == null ? null : (
              <p
                className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-destructive text-sm"
                role="alert"
              >
                {error}
              </p>
            )}
            {recentProjects.length === 0 ? null : (
              <RecentProjects
                projects={recentProjects}
                onOpen={(projectPath) => {
                  setPath(projectPath);
                  loadProject(projectPath).catch(() => undefined);
                }}
              />
            )}
          </div>
          <Separator />
          <ScrollArea className="lg:h-[calc(100svh-15rem)]">
            <div className="space-y-6 p-5">
              <BranchList
                branches={branches}
                selectedBranch={selectedBranch}
                onSelect={(branch) => {
                  setSelectedBranch(branch.name);
                  setSelectedMode("branch");
                  persistPreferences({ selectedMode: "branch" });
                }}
              />
              <WorktreeList
                worktrees={worktrees}
                onOpen={(worktreePath) => {
                  setPath(worktreePath);
                  loadProject(worktreePath).catch(() => undefined);
                }}
              />
            </div>
          </ScrollArea>
        </aside>

        <section className="min-w-0 p-5 lg:p-8">
          <div className="mx-auto max-w-6xl space-y-6">
            <ProjectHeader project={project} status={status} />
            <Tabs
              value={selectedMode}
              onValueChange={(value) => {
                const mode = value as DiffMode;
                setSelectedMode(mode);
                persistPreferences({ selectedMode: mode });
              }}
            >
              <TabsList className="h-auto flex-wrap justify-start">
                <TabsTrigger value="branch">Branch</TabsTrigger>
                <TabsTrigger value="staged">Staged</TabsTrigger>
                <TabsTrigger value="unstaged">Unstaged</TabsTrigger>
                <TabsTrigger value="combined">Worktree</TabsTrigger>
                <TabsTrigger value="full">Full review</TabsTrigger>
              </TabsList>
              <TabsContent value={selectedMode} className="mt-5">
                {project == null ? (
                  <div className="rounded-xl border bg-card p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="font-semibold text-xl">
                          Open a project
                        </h2>
                        <p className="text-muted-foreground text-sm">
                          Enter a local Git repository path to review branches,
                          worktree changes, staged changes, or a full diff.
                        </p>
                      </div>
                      <Badge variant="secondary">{selectedMode}</Badge>
                    </div>
                  </div>
                ) : (
                  <Suspense
                    fallback={
                      <div className="rounded-xl border bg-card p-5 text-muted-foreground text-sm shadow-sm">
                        Loading diff renderer...
                      </div>
                    }
                  >
                    <DiffViewer
                      branch={selectedBranch}
                      diffStyle={diffStyle}
                      mode={selectedMode}
                      overflow={overflow}
                      path={project.repoRoot}
                      refreshKey={diffRefreshVersion}
                      onDiffStyleChange={(nextDiffStyle) => {
                        setDiffStyle(nextDiffStyle);
                        persistPreferences({ diffStyle: nextDiffStyle });
                      }}
                      onOverflowChange={(nextOverflow) => {
                        setOverflow(nextOverflow);
                        persistPreferences({ overflow: nextOverflow });
                      }}
                    />
                  </Suspense>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </div>
    </main>
  );
}

function RecentProjects({
  projects,
  onOpen,
}: {
  projects: RecentProject[];
  onOpen(path: string): void;
}) {
  return (
    <section className="space-y-2">
      <h2 className="font-medium text-sm">Recent projects</h2>
      <div className="space-y-1">
        {projects.slice(0, 5).map((project) => (
          <button
            className="w-full rounded-lg border bg-background/60 px-3 py-2 text-left text-sm hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            key={project.path}
            onClick={() => onOpen(project.path)}
            type="button"
          >
            <span className="block truncate font-medium">{project.name}</span>
            <span className="block truncate text-muted-foreground text-xs">
              {project.path}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function ProjectHeader({
  project,
  status,
}: {
  project: ProjectSummary | null;
  status: StatusSummary | null;
}) {
  if (project == null) {
    return (
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <h2 className="font-semibold text-2xl tracking-tight">
          Open a Git project
        </h2>
        <p className="mt-2 text-muted-foreground">
          Branches, worktrees, status, and local diff modes appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">{project.repoRoot}</p>
          <h2 className="mt-1 font-semibold text-3xl tracking-tight">
            {project.currentBranch ?? "Detached HEAD"}
          </h2>
        </div>
        <Badge>{project.defaultBranch.ref}</Badge>
      </div>
      {status == null ? null : (
        <div className="mt-5 flex flex-wrap gap-2">
          <Badge variant="secondary">{status.staged} staged</Badge>
          <Badge variant="secondary">{status.unstaged} unstaged</Badge>
          <Badge variant="secondary">{status.untracked} untracked</Badge>
          <Badge variant="secondary">{status.conflicted} conflicted</Badge>
        </div>
      )}
    </div>
  );
}

function BranchList({
  branches,
  selectedBranch,
  onSelect,
}: {
  branches: BranchSummary[];
  selectedBranch: string | undefined;
  onSelect(branch: BranchSummary): void;
}) {
  return (
    <section className="space-y-2">
      <h2 className="font-medium text-sm">Branches</h2>
      {branches.length === 0 ? (
        <p className="text-muted-foreground text-sm">No branches loaded.</p>
      ) : null}
      {branches.map((branch) => (
        <button
          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-sidebar-accent"
          aria-pressed={selectedBranch === branch.name}
          key={branch.ref}
          onClick={() => onSelect(branch)}
          type="button"
        >
          <span className="truncate">{branch.name}</span>
          <Badge
            variant={selectedBranch === branch.name ? "default" : "secondary"}
          >
            {branch.type}
          </Badge>
        </button>
      ))}
    </section>
  );
}

function WorktreeList({
  worktrees,
  onOpen,
}: {
  worktrees: WorktreeSummary[];
  onOpen(path: string): void;
}) {
  return (
    <section className="space-y-2">
      <h2 className="font-medium text-sm">Worktrees</h2>
      {worktrees.length === 0 ? (
        <p className="text-muted-foreground text-sm">No worktrees loaded.</p>
      ) : null}
      {worktrees.map((worktree) => (
        <button
          className="w-full rounded-lg border bg-background/60 p-3 text-left text-sm hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          key={worktree.path}
          onClick={() => onOpen(worktree.path)}
          type="button"
        >
          <div className="font-medium">{worktree.branch ?? "Detached"}</div>
          <div className="truncate text-muted-foreground text-xs">
            {worktree.path}
          </div>
        </button>
      ))}
    </section>
  );
}
