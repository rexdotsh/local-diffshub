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
  mobileOverlayOpen: boolean;
  onMobileClose(): void;
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
  mobileOverlayOpen,
  onMobileClose,
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
    <>
      <button
        aria-hidden={!mobileOverlayOpen}
        aria-label="Close file tree"
        className={cn(
          "absolute inset-0 z-20 bg-background/60 backdrop-blur-xs transition-opacity md:hidden",
          mobileOverlayOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        )}
        onClick={onMobileClose}
        tabIndex={mobileOverlayOpen ? 0 : -1}
        type="button"
      />
      <aside
        className={cn(
          "absolute inset-x-0 bottom-0 z-30 flex h-[min(78svh,42rem)] min-h-0 flex-col rounded-t-xl border-t border-[var(--color-border-opaque,var(--border))] shadow-[0_0_0_1px_var(--color-border-opaque,var(--border)),0_-18px_40px_rgb(0_0_0/0.28)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform md:relative md:inset-auto md:z-auto md:h-full md:translate-y-0 md:rounded-none md:border-t-0 md:border-r md:shadow-none md:will-change-auto motion-reduce:transition-none",
          mobileOverlayOpen
            ? "pointer-events-auto translate-y-0"
            : "pointer-events-none translate-y-[calc(100%+1rem)] md:pointer-events-auto",
          chromeStyle == null && "bg-[var(--app-sidebar-bg)]"
        )}
        style={chromeStyle}
      >
        <div className="flex items-center justify-between gap-2 px-3 py-3 md:px-2 md:py-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Files
          </span>
          <div className="flex items-center gap-1">
            {model != null && <FileTreeSearchToggle model={model} />}
            <Button
              className="md:hidden"
              onClick={onMobileClose}
              size="sm"
              type="button"
              variant="ghost"
            >
              Close
            </Button>
          </div>
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
    </>
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
