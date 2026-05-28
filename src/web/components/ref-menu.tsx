import {
  IconBranch,
  IconCheck,
  IconChevronSm,
  IconCommit,
} from "@pierre/icons";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { BranchSummary, CommitSummary, DiffMode } from "../../shared/api";

const RELATIVE_TIME = new Intl.RelativeTimeFormat(undefined, {
  numeric: "auto",
});
const RELATIVE_UNITS: ReadonlyArray<{
  ms: number;
  unit: Intl.RelativeTimeFormatUnit;
}> = [
  { ms: 60_000, unit: "second" },
  { ms: 3_600_000, unit: "minute" },
  { ms: 86_400_000, unit: "hour" },
  { ms: 2_592_000_000, unit: "day" },
];

const TRIGGER_CLASS =
  "inline-flex h-7 items-center gap-1.5 rounded-md border border-border/60 bg-card/40 px-2 text-xs hover:bg-input/40 aria-expanded:bg-muted";

type RefMenuProps = {
  branches: BranchSummary[];
  commits: CommitSummary[];
  mode: DiffMode;
  onSelectBranch(branch: string): void;
  onSelectCommit(commit: string): void;
  selectedBranch: string | undefined;
  selectedCommit: string | undefined;
};

export function RefMenu({
  branches,
  commits,
  mode,
  onSelectBranch,
  onSelectCommit,
  selectedBranch,
  selectedCommit,
}: RefMenuProps) {
  if (mode !== "branch" && mode !== "commit") {
    return null;
  }

  const triggerLabel =
    mode === "branch"
      ? (selectedBranch ?? "Select branch")
      : selectedCommit == null
        ? "Select commit"
        : shortHash(selectedCommit);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={TRIGGER_CLASS}>
        {mode === "branch" ? (
          <IconBranch aria-hidden className="size-3.5 text-muted-foreground" />
        ) : (
          <IconCommit aria-hidden className="size-3.5 text-muted-foreground" />
        )}
        <span className="max-w-[12rem] truncate">{triggerLabel}</span>
        <IconChevronSm aria-hidden className="size-3 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-96 w-72">
        {mode === "branch" ? (
          <BranchList
            branches={branches}
            onSelect={onSelectBranch}
            selected={selectedBranch}
          />
        ) : (
          <CommitList
            commits={commits}
            onSelect={onSelectCommit}
            selected={selectedCommit}
          />
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function BranchList({
  branches,
  onSelect,
  selected,
}: {
  branches: BranchSummary[];
  onSelect(name: string): void;
  selected: string | undefined;
}) {
  if (branches.length === 0) {
    return <DropdownMenuItem disabled>No branches loaded</DropdownMenuItem>;
  }
  const local = branches.filter((branch) => branch.type === "local");
  const remote = branches.filter((branch) => branch.type === "remote");
  return (
    <>
      {local.length > 0 ? (
        <BranchSection
          items={local}
          label="Local"
          onSelect={onSelect}
          selected={selected}
        />
      ) : null}
      {remote.length > 0 ? (
        <>
          {local.length > 0 ? <DropdownMenuSeparator /> : null}
          <BranchSection
            items={remote}
            label="Remote"
            onSelect={onSelect}
            selected={selected}
          />
        </>
      ) : null}
    </>
  );
}

function BranchSection({
  items,
  label,
  onSelect,
  selected,
}: {
  items: BranchSummary[];
  label: string;
  onSelect(name: string): void;
  selected: string | undefined;
}) {
  return (
    <>
      <DropdownMenuLabel className="px-2 py-1 text-[10px] uppercase tracking-wider">
        {label}
      </DropdownMenuLabel>
      {items.map((branch) => (
        <DropdownMenuItem
          className="justify-between gap-2"
          key={branch.ref}
          onClick={() => onSelect(branch.name)}
        >
          <span className="flex min-w-0 items-center gap-2">
            <SelectedIndicator selected={selected === branch.name} />
            <span className="truncate">{branch.name}</span>
          </span>
          {branch.current ? (
            <span className="text-[10px] text-emerald-400">current</span>
          ) : null}
        </DropdownMenuItem>
      ))}
    </>
  );
}

function CommitList({
  commits,
  onSelect,
  selected,
}: {
  commits: CommitSummary[];
  onSelect(hash: string): void;
  selected: string | undefined;
}) {
  if (commits.length === 0) {
    return <DropdownMenuItem disabled>No commits loaded</DropdownMenuItem>;
  }
  return (
    <>
      {commits.map((commit) => (
        <DropdownMenuItem
          className="gap-2"
          key={commit.hash}
          onClick={() => onSelect(commit.hash)}
        >
          <SelectedIndicator selected={selected === commit.hash} />
          <span className="flex min-w-0 flex-col">
            <span className="flex w-full items-center justify-between gap-2 text-xs">
              <span className="truncate font-medium">
                {commit.subject || "(no subject)"}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {commit.shortHash}
              </span>
            </span>
            <span className="truncate text-[10px] text-muted-foreground">
              {commit.author} · {formatRelative(commit.committedAt)}
            </span>
          </span>
        </DropdownMenuItem>
      ))}
    </>
  );
}

function SelectedIndicator({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden
      className="inline-flex size-3 items-center justify-center"
    >
      {selected ? <IconCheck className="size-3 text-emerald-400" /> : null}
    </span>
  );
}

function shortHash(commit: string): string {
  return commit.length > 7 ? commit.slice(0, 7) : commit;
}

function formatRelative(value: string): string {
  const then = Date.parse(value);
  if (!Number.isFinite(then)) {
    return value;
  }
  const diffMs = then - Date.now();
  const absMs = Math.abs(diffMs);
  for (const { ms, unit } of RELATIVE_UNITS) {
    if (absMs < ms * 60) {
      return RELATIVE_TIME.format(Math.round(diffMs / ms), unit);
    }
  }
  return RELATIVE_TIME.format(Math.round(diffMs / 2_592_000_000), "month");
}
