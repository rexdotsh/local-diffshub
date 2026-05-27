import {
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
  StatusSummary,
  WorktreeSummary,
} from "../shared/api";
import {
  createDiffRequestPreview,
  loadBranches,
  loadStatus,
  loadWorktrees,
  openProject,
} from "./api";

type LoadState = "idle" | "loading" | "ready" | "error";

const DEFAULT_PATH = "/home/majdoor/diffs";

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
  const requestIdRef = useRef(0);
  const selectedProjectPath = project?.repoRoot;

  const loadProject = useCallback(
    async (nextPath: string, preserveBranch = false): Promise<void> => {
      const requestId = ++requestIdRef.current;
      setLoadState("loading");
      setError(null);
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
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to open project."
        );
        setLoadState("error");
      }
    },
    []
  );

  useEffect(() => {
    if (selectedProjectPath == null) {
      return;
    }

    const events = new EventSource(
      `/events/project?path=${encodeURIComponent(selectedProjectPath)}`
    );
    events.addEventListener("project-change", () => {
      loadProject(selectedProjectPath, true).catch(() => undefined);
    });
    return () => events.close();
  }, [loadProject, selectedProjectPath]);

  const diffURL =
    project == null
      ? null
      : createDiffRequestPreview(
          project.repoRoot,
          selectedMode,
          selectedBranch
        );

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
                }}
              />
              <WorktreeList worktrees={worktrees} />
            </div>
          </ScrollArea>
        </aside>

        <section className="min-w-0 p-5 lg:p-8">
          <div className="mx-auto max-w-6xl space-y-6">
            <ProjectHeader project={project} status={status} />
            <Tabs
              value={selectedMode}
              onValueChange={(value) => setSelectedMode(value as DiffMode)}
            >
              <TabsList>
                <TabsTrigger value="branch">Branch</TabsTrigger>
                <TabsTrigger value="staged">Staged</TabsTrigger>
                <TabsTrigger value="unstaged">Unstaged</TabsTrigger>
                <TabsTrigger value="combined">Worktree</TabsTrigger>
                <TabsTrigger value="full">Full review</TabsTrigger>
              </TabsList>
              <TabsContent value={selectedMode} className="mt-5">
                <div className="rounded-xl border bg-card p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-xl">Diff request</h2>
                      <p className="text-muted-foreground text-sm">
                        Pierre viewer integration lands next. This shell already
                        resolves a valid stream payload.
                      </p>
                    </div>
                    <Badge variant="secondary">{selectedMode}</Badge>
                  </div>
                  <pre className="mt-4 overflow-auto rounded-lg bg-muted p-4 text-muted-foreground text-xs">
                    {diffURL ?? "Open a project to prepare a diff request."}
                  </pre>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </div>
    </main>
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

function WorktreeList({ worktrees }: { worktrees: WorktreeSummary[] }) {
  return (
    <section className="space-y-2">
      <h2 className="font-medium text-sm">Worktrees</h2>
      {worktrees.map((worktree) => (
        <div
          className="rounded-lg border bg-background/60 p-3 text-sm"
          key={worktree.path}
        >
          <div className="font-medium">{worktree.branch ?? "Detached"}</div>
          <div className="truncate text-muted-foreground text-xs">
            {worktree.path}
          </div>
        </div>
      ))}
    </section>
  );
}
