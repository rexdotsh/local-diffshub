import {
  IconArrowLeftBar,
  IconBranch,
  IconChevronSm,
  IconCodeFolder,
  IconFolder,
  IconFolderOpen,
  IconFolderPlus,
  IconSearch,
  IconX,
} from "@pierre/icons";
import {
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type {
  DirectoryEntry,
  ProjectSummary,
  RecentProject,
  WorktreeSummary,
} from "../../shared/api";
import { useDirectoryListing } from "../data/use-directory-listing";

type ProjectMenuProps = {
  className?: string | undefined;
  onOpen(path: string): Promise<void>;
  project: ProjectSummary | null;
  recentProjects: RecentProject[];
  worktrees: WorktreeSummary[];
};

const TRIGGER_CLASS =
  "inline-flex h-7 min-w-0 items-center gap-1.5 rounded-md border border-border/60 bg-card/40 px-2 text-xs hover:bg-input/40 aria-expanded:bg-muted";

export function ProjectMenu({
  className,
  onOpen,
  project,
  recentProjects,
  worktrees,
}: ProjectMenuProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [path, setPath] = useState("");
  const projectLabel =
    project == null ? "Open project" : projectDisplayName(project);
  const visibleRecents = useMemo(
    () =>
      recentProjects.filter((entry) => entry.isWorktree !== true).slice(0, 8),
    [recentProjects]
  );

  const fireOpen = (target: string) => {
    onOpen(target).catch(() => undefined);
  };

  const submitPath = () => {
    const trimmed = path.trim();
    if (trimmed === "") return;
    setDropdownOpen(false);
    fireOpen(trimmed);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitPath();
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation();
    if (event.key === "Enter") {
      event.preventDefault();
      submitPath();
    }
  };

  const handleSelectProject = (target: string) => {
    setDropdownOpen(false);
    fireOpen(target);
  };

  const handleOpenBrowser = () => {
    setDropdownOpen(false);
    setDialogOpen(true);
  };

  return (
    <>
      <DropdownMenu onOpenChange={setDropdownOpen} open={dropdownOpen}>
        <DropdownMenuTrigger className={cn(TRIGGER_CLASS, className)}>
          <IconFolderOpen
            aria-hidden
            className="size-3 shrink-0 text-muted-foreground"
          />
          <span className="min-w-0 truncate font-medium leading-none">
            {projectLabel}
          </span>
          <IconChevronSm
            aria-hidden
            className="size-3 shrink-0 text-muted-foreground"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-80 max-w-[calc(100vw-1rem)]"
        >
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
            <Button
              onClick={submitPath}
              size="sm"
              type="button"
              variant="default"
            >
              Open
            </Button>
          </form>
          {visibleRecents.length > 0 ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="px-2 py-1 text-[10px] uppercase tracking-wider">
                Recent
              </DropdownMenuLabel>
              {visibleRecents.map((recent) => (
                <DropdownMenuItem
                  className="gap-2"
                  key={recent.path}
                  onClick={() => handleSelectProject(recent.path)}
                >
                  <IconCodeFolder
                    aria-hidden
                    className="size-3 text-muted-foreground"
                  />
                  <span className="flex min-w-0 flex-col leading-tight">
                    <span className="truncate text-xs font-medium">
                      {recent.name}
                    </span>
                    <span className="truncate text-[10px] text-muted-foreground">
                      {recent.path}
                    </span>
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
          <DropdownMenuSeparator />
          <DropdownMenuItem className="gap-2" onClick={handleOpenBrowser}>
            <IconFolderPlus
              aria-hidden
              className="size-3 text-muted-foreground"
            />
            <span className="text-xs">Add project…</span>
            <span className="ml-auto text-[10px] text-muted-foreground">
              Browse
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
        <DialogContent className="max-w-xl">
          <ProjectBrowser
            onOpen={onOpen}
            onOpened={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

type NavigableItem =
  | { type: "parent"; path: string }
  | { type: "entry"; entry: DirectoryEntry };

function ProjectBrowser({
  onOpen,
  onOpened,
}: {
  onOpen(path: string): Promise<void>;
  onOpened(): void;
}) {
  const [query, setQuery] = useState("");
  const [openError, setOpenError] = useState<string | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listing = useDirectoryListing();
  const listContainerRef = useRef<HTMLDivElement>(null);

  const trimmed = query.trim();
  const pathMode = isPathLike(trimmed);

  const entries = listing.listing?.entries ?? [];
  const filtered = useMemo(() => {
    if (trimmed === "" || pathMode) return entries;
    const lower = trimmed.toLowerCase();
    return entries.filter((entry) => entry.name.toLowerCase().includes(lower));
  }, [entries, pathMode, trimmed]);

  const items = useMemo<NavigableItem[]>(() => {
    const result: NavigableItem[] = [];
    const parent = listing.listing?.parent;
    if (trimmed === "" && parent != null) {
      result.push({ path: parent, type: "parent" });
    }
    for (const entry of filtered) {
      result.push({ entry, type: "entry" });
    }
    return result;
  }, [filtered, listing.listing?.parent, trimmed]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: clear filter when directory changes.
  useEffect(() => {
    setQuery("");
    setOpenError(null);
  }, [listing.listing?.path]);

  // Reset highlight on query/path change. Filter mode with non-empty query
  // snaps to 0 ("auto-hover the first match"); empty query / path mode
  // shows no preselection until the user presses an arrow.
  useEffect(() => {
    setActiveIndex(trimmed !== "" && !pathMode ? 0 : -1);
  }, [pathMode, trimmed]);

  const effectiveActiveIndex =
    pathMode || activeIndex < 0 || items.length === 0
      ? -1
      : Math.min(activeIndex, items.length - 1);

  useEffect(() => {
    if (effectiveActiveIndex < 0) return;
    const container = listContainerRef.current;
    if (container == null) return;
    const target = container.querySelector<HTMLElement>(
      '[aria-current="true"]'
    );
    target?.scrollIntoView({ block: "nearest" });
  }, [effectiveActiveIndex]);

  const tryOpen = async (target: string) => {
    setIsOpening(true);
    setOpenError(null);
    try {
      await onOpen(target);
      onOpened();
    } catch (error) {
      setOpenError(
        error instanceof Error ? error.message : "Unable to open project."
      );
    } finally {
      setIsOpening(false);
    }
  };

  const activateItem = (item: NavigableItem) => {
    if (item.type === "parent") {
      listing.navigate(item.path);
      return;
    }
    if (item.entry.kind === "git-repo") {
      tryOpen(item.entry.path);
      return;
    }
    listing.navigate(item.entry.path);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isOpening) return;
    if (pathMode) {
      if (trimmed === "") return;
      tryOpen(trimmed);
      return;
    }
    if (effectiveActiveIndex >= 0) {
      const item = items[effectiveActiveIndex];
      if (item != null) activateItem(item);
      return;
    }
    const fallback = items[0];
    if (fallback != null) activateItem(fallback);
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (pathMode) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (items.length === 0) return;
      setActiveIndex((index) => (index < 0 ? 0 : (index + 1) % items.length));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (items.length === 0) return;
      setActiveIndex((index) =>
        index < 0 ? items.length - 1 : (index - 1 + items.length) % items.length
      );
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        <DialogTitle className="shrink-0 font-medium text-sm">
          Add project
        </DialogTitle>
        <span className="hidden text-muted-foreground sm:inline">·</span>
        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">
          {listing.listing?.path ??
            (listing.loadState === "loading" ? "Loading…" : "")}
        </span>
        <DialogClose
          aria-label="Close"
          className="-mr-1 inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <IconX aria-hidden className="size-3" />
        </DialogClose>
      </div>
      <form className="px-4 pb-2" onSubmit={handleSubmit}>
        <div
          className={cn(
            "flex items-center gap-2 rounded-md border border-border bg-input/20 px-2 py-1.5 transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30",
            openError != null &&
              "border-destructive/60 focus-within:ring-destructive/30"
          )}
        >
          <IconSearch aria-hidden className="size-3 text-muted-foreground" />
          <input
            aria-label="Filter or type an absolute path"
            autoFocus
            className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
            onChange={(event) => {
              setQuery(event.target.value);
              if (openError != null) setOpenError(null);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Filter folders or type /path…"
            value={query}
          />
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {pathMode ? "↵ open" : trimmed === "" ? "" : "↵ jump"}
          </span>
        </div>
      </form>
      {openError != null ? (
        <div
          aria-live="polite"
          className="mx-4 mb-2 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-[11px] text-destructive"
        >
          <span className="flex-1">{openError}</span>
          <button
            aria-label="Dismiss error"
            className="shrink-0 rounded text-destructive/70 hover:text-destructive"
            onClick={() => setOpenError(null)}
            type="button"
          >
            <IconX aria-hidden className="size-3" />
          </button>
        </div>
      ) : null}
      <div
        className="cv-mini-scrollbar min-h-0 flex-1 overflow-y-auto border-t border-border/60 px-2 py-1"
        ref={listContainerRef}
      >
        <EntryList
          activeIndex={effectiveActiveIndex}
          error={listing.error}
          items={items}
          loadState={listing.loadState}
          onActivate={(index) => {
            const item = items[index];
            if (item != null) activateItem(item);
          }}
          pathMode={pathMode}
          query={trimmed}
        />
      </div>
    </div>
  );
}

function EntryList({
  activeIndex,
  error,
  items,
  loadState,
  onActivate,
  pathMode,
  query,
}: {
  activeIndex: number;
  error: string | null;
  items: readonly NavigableItem[];
  loadState: "idle" | "loading" | "ready" | "error";
  onActivate(index: number): void;
  pathMode: boolean;
  query: string;
}) {
  const entryCount = items.reduce(
    (count, item) => (item.type === "entry" ? count + 1 : count),
    0
  );
  return (
    <ul>
      {items.map((item, index) => {
        const active = index === activeIndex;
        const onClick = () => onActivate(index);
        if (item.type === "parent") {
          return (
            <EntryRow
              active={active}
              icon={<IconArrowLeftBar aria-hidden className="size-3" />}
              key="__parent__"
              name=".."
              onClick={onClick}
              trailing={
                <span className="text-[10px] text-muted-foreground">
                  parent
                </span>
              }
            />
          );
        }
        const entry = item.entry;
        return (
          <EntryRow
            active={active}
            icon={
              entry.kind === "git-repo" ? (
                <IconCodeFolder
                  aria-hidden
                  className="size-3 text-emerald-400"
                />
              ) : (
                <IconFolder
                  aria-hidden
                  className="size-3 text-muted-foreground"
                />
              )
            }
            key={entry.path}
            name={entry.name}
            onClick={onClick}
            trailing={
              entry.kind === "git-repo" ? (
                <span className="text-[10px] text-emerald-400">git</span>
              ) : null
            }
          />
        );
      })}
      {loadState === "error" ? (
        <li className="px-2 py-2 text-[11px] text-destructive">
          {error ?? "Unable to read directory."}
        </li>
      ) : null}
      {loadState === "ready" && entryCount === 0 ? (
        <li className="px-2 py-3 text-[11px] text-muted-foreground">
          {pathMode
            ? "Press Enter to try opening this path."
            : query === ""
              ? "No folders here."
              : "No matches in this folder."}
        </li>
      ) : null}
    </ul>
  );
}

function EntryRow({
  active,
  icon,
  name,
  onClick,
  trailing,
}: {
  active?: boolean;
  icon: ReactNode;
  name: string;
  onClick(): void;
  trailing?: ReactNode;
}) {
  return (
    <li>
      <button
        aria-current={active === true ? "true" : undefined}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-1 text-left outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground",
          active === true && "bg-accent text-accent-foreground"
        )}
        onClick={onClick}
        type="button"
      >
        {icon}
        <span className="min-w-0 flex-1 truncate text-xs">{name}</span>
        {trailing}
      </button>
    </li>
  );
}

function isPathLike(value: string): boolean {
  return (
    value.startsWith("/") ||
    value.startsWith("~") ||
    value.startsWith("./") ||
    value.startsWith("../")
  );
}

function projectDisplayName(project: ProjectSummary): string {
  const parts = project.repoRoot
    .split("/")
    .filter((segment) => segment.length > 0);
  return parts.at(-1) ?? project.repoRoot;
}
