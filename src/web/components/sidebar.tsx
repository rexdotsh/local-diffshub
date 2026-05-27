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
  loadState: LoadState;
  onSelectPath(itemId: string): void;
  stats: DiffStats | null;
  treeSource: TreeSource | null;
};

export function Sidebar({
  loadState,
  onSelectPath,
  stats,
  treeSource,
}: SidebarProps) {
  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-border/60 bg-[var(--app-sidebar-bg)]">
      <div className="min-h-0 flex-1">
        {treeSource == null || treeSource.pathCount === 0 ? (
          <p
            aria-live="polite"
            className="flex h-full items-center justify-center px-4 py-6 text-center text-muted-foreground text-xs"
            role="status"
          >
            {EMPTY_MESSAGE_BY_STATE[loadState]}
          </p>
        ) : (
          <DiffFileTree onSelectPath={onSelectPath} source={treeSource} />
        )}
      </div>
      <DiffStatsBar stats={stats} streaming={loadState === "streaming"} />
    </aside>
  );
}
