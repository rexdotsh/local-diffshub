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
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { BranchSummary, CommitSummary, DiffMode } from "../../shared/api";

export type ChangesScope = "combined" | "staged" | "unstaged";

const CHANGES_PILL_LABEL: Record<ChangesScope, string> = {
  combined: "Changes",
  staged: "Staged",
  unstaged: "Unstaged",
};

const CHANGES_OPTIONS: ReadonlyArray<{ label: string; value: ChangesScope }> = [
  { label: "All changes", value: "combined" },
  { label: "Staged only", value: "staged" },
  { label: "Unstaged only", value: "unstaged" },
];

const PILL_BASE =
  "inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border px-2 text-xs transition-colors outline-none";
const PILL_INACTIVE =
  "border-border/40 bg-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground";
const PILL_ACTIVE = "border-border/80 bg-muted text-foreground";

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

export function isChangesScope(mode: DiffMode): mode is ChangesScope {
  return mode === "combined" || mode === "staged" || mode === "unstaged";
}

type ModePillsProps = {
  branches: BranchSummary[];
  commits: CommitSummary[];
  lastChangesScope: ChangesScope;
  mode: DiffMode;
  onSelectBranch(branch: string): void;
  onSelectCommit(commit: string): void;
  onSetMode(mode: DiffMode): void;
  selectedBranch: string | undefined;
  selectedCommit: string | undefined;
};

export function ModePills({
  branches,
  commits,
  lastChangesScope,
  mode,
  onSelectBranch,
  onSelectCommit,
  onSetMode,
  selectedBranch,
  selectedCommit,
}: ModePillsProps) {
  const changesScope: ChangesScope = isChangesScope(mode)
    ? mode
    : lastChangesScope;

  return (
    <div className="inline-flex h-7 items-center gap-1">
      <ChangesPill
        active={isChangesScope(mode)}
        onActivate={() => onSetMode(lastChangesScope)}
        onChange={(next) => onSetMode(next)}
        scope={changesScope}
      />
      <BranchPill
        active={mode === "branch"}
        branches={branches}
        onActivate={() => onSetMode("branch")}
        onSelect={onSelectBranch}
        selected={selectedBranch}
      />
      <CommitPill
        active={mode === "commit"}
        commits={commits}
        onActivate={() => onSetMode("commit")}
        onSelect={onSelectCommit}
        selected={selectedCommit}
      />
    </div>
  );
}

function ChangesPill({
  active,
  onActivate,
  onChange,
  scope,
}: {
  active: boolean;
  onActivate(): void;
  onChange(next: ChangesScope): void;
  scope: ChangesScope;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(PILL_BASE, active ? PILL_ACTIVE : PILL_INACTIVE)}
        onClick={() => {
          if (!active) onActivate();
        }}
      >
        <span>{CHANGES_PILL_LABEL[scope]}</span>
        <IconChevronSm aria-hidden className="size-3 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuRadioGroup
          onValueChange={(v) => onChange(v as ChangesScope)}
          value={scope}
        >
          {CHANGES_OPTIONS.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function BranchPill({
  active,
  branches,
  onActivate,
  onSelect,
  selected,
}: {
  active: boolean;
  branches: BranchSummary[];
  onActivate(): void;
  onSelect(name: string): void;
  selected: string | undefined;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(PILL_BASE, active ? PILL_ACTIVE : PILL_INACTIVE)}
        onClick={() => {
          if (!active) onActivate();
        }}
      >
        <IconBranch aria-hidden className="size-3 opacity-60" />
        <span className="max-w-[10rem] truncate">{selected ?? "Branch"}</span>
        <IconChevronSm aria-hidden className="size-3 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-96 w-72">
        <BranchList
          branches={branches}
          onSelect={onSelect}
          selected={selected}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CommitPill({
  active,
  commits,
  onActivate,
  onSelect,
  selected,
}: {
  active: boolean;
  commits: CommitSummary[];
  onActivate(): void;
  onSelect(hash: string): void;
  selected: string | undefined;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(PILL_BASE, active ? PILL_ACTIVE : PILL_INACTIVE)}
        onClick={() => {
          if (!active) onActivate();
        }}
      >
        <IconCommit aria-hidden className="size-3 opacity-60" />
        <span className="font-mono">
          {selected == null ? "Commit" : shortHash(selected)}
        </span>
        <IconChevronSm aria-hidden className="size-3 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-96 w-80">
        <CommitList commits={commits} onSelect={onSelect} selected={selected} />
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
  if (!Number.isFinite(then)) return value;
  const diffMs = then - Date.now();
  const absMs = Math.abs(diffMs);
  for (const { ms, unit } of RELATIVE_UNITS) {
    if (absMs < ms * 60) {
      return RELATIVE_TIME.format(Math.round(diffMs / ms), unit);
    }
  }
  return RELATIVE_TIME.format(Math.round(diffMs / 2_592_000_000), "month");
}
