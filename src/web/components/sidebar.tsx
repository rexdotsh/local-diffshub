import type { DiffsThemeNames } from "@pierre/diffs";
import { IconSearch } from "@pierre/icons";
import type { FileTree as FileTreeModel } from "@pierre/trees";
import { useFileTreeSearch } from "@pierre/trees/react";
import { type CSSProperties, useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DiffStats, TreeSource } from "../data/accumulator";
import type { LoadState } from "../data/use-diff-session";
import { DiffStatsBar } from "./diff-stats";
import { DiffFileTree } from "./file-tree";

const EMPTY_MESSAGE_BY_STATE: Record<LoadState, string> = {
  empty: "No changed files",
  error: "Couldn’t load files",
  idle: "Open a project to see files",
  ready: "",
  streaming: "Reading patch…",
};

type SidebarProps = {
  chromeStyle?: CSSProperties | undefined;
  darkTheme: DiffsThemeNames;
  lightTheme: DiffsThemeNames;
  loadState: LoadState;
  onSelectPath(itemId: string): void;
  resolvedColorMode: "light" | "dark";
  stats: DiffStats | null;
  treeSource: TreeSource | null;
};

export function Sidebar({
  chromeStyle,
  darkTheme,
  lightTheme,
  loadState,
  onSelectPath,
  resolvedColorMode,
  stats,
  treeSource,
}: SidebarProps) {
  const [model, setModel] = useState<FileTreeModel | null>(null);
  const onModelReady = useCallback((next: FileTreeModel | null) => {
    setModel(next);
  }, []);

  const empty = treeSource == null || treeSource.pathCount === 0;

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 flex-col border-r border-[var(--color-border-opaque,var(--border))]",
        chromeStyle == null && "bg-[var(--app-sidebar-bg)]"
      )}
      style={chromeStyle}
    >
      <div className="flex items-center justify-between gap-2 px-2 py-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Files
        </span>
        {model != null && <FileTreeSearchToggle model={model} />}
      </div>
      <div className="min-h-0 flex-1">
        {empty ? (
          <p
            aria-live="polite"
            className="flex h-full items-center justify-center px-4 py-6 text-center text-muted-foreground text-xs"
            role="status"
          >
            {EMPTY_MESSAGE_BY_STATE[loadState]}
          </p>
        ) : (
          <DiffFileTree
            darkTheme={darkTheme}
            lightTheme={lightTheme}
            onModelReady={onModelReady}
            onSelectPath={onSelectPath}
            resolvedColorMode={resolvedColorMode}
            source={treeSource}
          />
        )}
      </div>
      <DiffStatsBar stats={stats} streaming={loadState === "streaming"} />
    </aside>
  );
}

function FileTreeSearchToggle({ model }: { model: FileTreeModel }) {
  const search = useFileTreeSearch(model);
  return (
    <Button
      aria-label={search.isOpen ? "Hide file search" : "Show file search"}
      aria-pressed={search.isOpen}
      onClick={() => (search.isOpen ? search.close() : search.open())}
      // Prevent focus moving here on pointerdown: the search input closes on
      // blur, so without this the blur fires before click and reopens.
      onPointerDown={(event) => event.preventDefault()}
      size="icon-sm"
      title={search.isOpen ? "Hide file search" : "Show file search"}
      variant="ghost"
    >
      <IconSearch aria-hidden />
    </Button>
  );
}
