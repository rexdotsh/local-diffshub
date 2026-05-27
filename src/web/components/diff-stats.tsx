import { IconDiffAddFill, IconDiffDeletedFill, IconFile } from "@pierre/icons";

import type { DiffStats } from "../data/accumulator";

type DiffStatsBarProps = {
  stats: DiffStats | null;
  streaming: boolean;
};

export function DiffStatsBar({ stats, streaming }: DiffStatsBarProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border/60 bg-[var(--app-sidebar-bg)] px-3 py-2 text-xs">
      <div className="flex min-w-0 items-center gap-3 text-muted-foreground tabular-nums">
        <Stat
          icon={<IconFile aria-hidden className="size-3" />}
          label="files"
          value={stats?.fileCount ?? 0}
        />
        <Stat
          className="text-emerald-400"
          icon={<IconDiffAddFill aria-hidden className="size-3" />}
          label="added"
          value={stats?.addedLines ?? 0}
        />
        <Stat
          className="text-red-400"
          icon={<IconDiffDeletedFill aria-hidden className="size-3" />}
          label="removed"
          value={stats?.deletedLines ?? 0}
        />
      </div>
      {streaming ? (
        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-300">
          streaming
        </span>
      ) : null}
    </div>
  );
}

function Stat({
  className = "",
  icon,
  label,
  value,
}: {
  className?: string;
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {icon}
      <span className="font-medium">{value}</span>
      <span className="text-muted-foreground/70">{label}</span>
    </span>
  );
}
