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
      className="inline-flex h-7 items-center gap-0.5 rounded-md bg-muted/40 p-0.5 text-xs"
      role="group"
    >
      {MODE_OPTIONS.map((option) => (
        <button
          aria-pressed={mode === option.mode}
          className="rounded px-1.5 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-sm"
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
