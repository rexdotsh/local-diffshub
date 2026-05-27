import { IconBranch, IconChevronSm, IconFolderOpen } from "@pierre/icons";
import { type FormEvent, type KeyboardEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type {
  ProjectSummary,
  RecentProject,
  WorktreeSummary,
} from "../../shared/api";

type ProjectMenuProps = {
  onOpen(path: string): void;
  project: ProjectSummary | null;
  recentProjects: RecentProject[];
  worktrees: WorktreeSummary[];
};

const TRIGGER_CLASS =
  "inline-flex h-8 min-w-0 items-center gap-2 rounded-md border border-border/70 bg-card/40 px-2 text-xs hover:bg-input/40 aria-expanded:bg-muted";

export function ProjectMenu({
  onOpen,
  project,
  recentProjects,
  worktrees,
}: ProjectMenuProps) {
  const [open, setOpen] = useState(false);
  const [path, setPath] = useState("");
  const projectLabel =
    project == null ? "Open project" : projectDisplayName(project);
  const projectHint = projectStateLabel(project);

  const submit = () => {
    const trimmed = path.trim();
    if (trimmed === "") {
      return;
    }
    setOpen(false);
    onOpen(trimmed);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit();
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation();
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
    }
  };

  const handleSelectProject = (target: string) => {
    setOpen(false);
    onOpen(target);
  };

  return (
    <DropdownMenu onOpenChange={setOpen} open={open}>
      <DropdownMenuTrigger className={TRIGGER_CLASS}>
        <IconFolderOpen
          aria-hidden
          className="size-3.5 shrink-0 text-muted-foreground"
        />
        <span className="flex min-w-0 flex-col items-start leading-tight">
          <span className="truncate font-medium">{projectLabel}</span>
          <span
            aria-hidden
            className="truncate text-[10px] text-muted-foreground"
          >
            {projectHint}
          </span>
        </span>
        <IconChevronSm
          aria-hidden
          className="size-3 shrink-0 text-muted-foreground"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80">
        <form
          aria-label="Open project by path"
          className="flex items-center gap-1 p-1"
          onSubmit={handleSubmit}
        >
          <Input
            aria-label="Project path"
            className="h-7 text-xs"
            onChange={(event) => setPath(event.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="/path/to/repository"
            value={path}
          />
          <Button onClick={submit} size="sm" type="button" variant="default">
            Open
          </Button>
        </form>
        {recentProjects.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="px-2 py-1 text-[10px] uppercase tracking-wider">
              Recent
            </DropdownMenuLabel>
            {recentProjects.slice(0, 8).map((recent) => (
              <DropdownMenuItem
                className="flex-col items-start gap-0"
                key={recent.path}
                onClick={() => handleSelectProject(recent.path)}
              >
                <span className="truncate text-xs font-medium">
                  {recent.name}
                </span>
                <span className="truncate text-[10px] text-muted-foreground">
                  {recent.path}
                </span>
              </DropdownMenuItem>
            ))}
          </>
        ) : null}
        {worktrees.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="px-2 py-1 text-[10px] uppercase tracking-wider">
              Worktrees
            </DropdownMenuLabel>
            {worktrees.map((worktree) => (
              <DropdownMenuItem
                className="gap-2"
                key={worktree.path}
                onClick={() => handleSelectProject(worktree.path)}
              >
                <IconBranch
                  aria-hidden
                  className="size-3 text-muted-foreground"
                />
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-xs font-medium">
                    {worktree.branch ?? "detached"}
                  </span>
                  <span className="truncate text-[10px] text-muted-foreground">
                    {worktree.path}
                  </span>
                </span>
              </DropdownMenuItem>
            ))}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function projectStateLabel(project: ProjectSummary | null): string {
  if (project == null) {
    return "no repository open";
  }
  if (project.currentBranch != null) {
    return project.currentBranch;
  }
  return "detached HEAD";
}

function projectDisplayName(project: ProjectSummary): string {
  const parts = project.repoRoot
    .split("/")
    .filter((segment) => segment.length > 0);
  return parts.at(-1) ?? project.repoRoot;
}
