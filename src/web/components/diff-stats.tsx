import { IconDiffAddFill, IconDiffDeletedFill, IconFile } from "@pierre/icons";

import type { DiffStats } from "../data/accumulator";

type DiffStatsBarProps = {
  stats: DiffStats | null;
  streaming: boolean;
};

export function DiffStatsBar({ stats, streaming }: DiffStatsBarProps) {
  return (
    <div className="flex items-center justify-between gap-2 border-t border-[var(--color-border-opaque,var(--border))] px-2 py-2 text-xs">
      <div className="flex min-w-0 items-center gap-3 text-muted-foreground tabular-nums">
        <Stat
          icon={<IconFile aria-hidden className="size-3" />}
          label="files"
          value={stats?.fileCount ?? 0}
        />
        <Stat
          className="text-[var(--diffhub-add-fg,#34d399)]"
          icon={<IconDiffAddFill aria-hidden className="size-3" />}
          label="added"
          value={stats?.addedLines ?? 0}
        />
        <Stat
          className="text-[var(--diffhub-del-fg,#fb7185)]"
          icon={<IconDiffDeletedFill aria-hidden className="size-3" />}
          label="removed"
          value={stats?.deletedLines ?? 0}
        />
      </div>
      {streaming ? (
        <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-300">
          live
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
    <span
      className={`inline-flex items-center gap-1 ${className}`}
      title={`${value} ${label}`}
    >
      {icon}
      <span className="font-medium">{value}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
