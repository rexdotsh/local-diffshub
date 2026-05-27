import type { DiffMode } from "../../shared/api";

const MODE_OPTIONS: ReadonlyArray<{ label: string; mode: DiffMode }> = [
  { label: "Worktree", mode: "combined" },
  { label: "Staged", mode: "staged" },
  { label: "Unstaged", mode: "unstaged" },
  { label: "Branch", mode: "branch" },
  { label: "Commit", mode: "commit" },
  { label: "Full", mode: "full" },
];

type ModeTabsProps = {
  mode: DiffMode;
  onChange(mode: DiffMode): void;
};

export function ModeTabs({ mode, onChange }: ModeTabsProps) {
  return (
    <div
      aria-label="Diff mode"
      className="inline-flex h-8 items-center rounded-md border border-border/70 bg-card/40 p-0.5 text-xs"
      role="group"
    >
      {MODE_OPTIONS.map((option) => (
        <button
          aria-pressed={mode === option.mode}
          className="rounded-sm px-2 py-1 text-muted-foreground transition-colors hover:text-foreground aria-pressed:bg-muted aria-pressed:text-foreground"
          key={option.mode}
          onClick={() => onChange(option.mode)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
