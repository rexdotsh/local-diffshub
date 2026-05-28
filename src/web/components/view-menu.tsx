import {
  IconCodeStyleBars,
  IconCollapsedRow,
  IconDiffSplit,
  IconDiffUnified,
  IconExpandAll,
  IconEyeSlash,
  IconGearFill,
  IconRefresh,
  IconSymbolDiffstat,
} from "@pierre/icons";
import type { CSSProperties, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type {
  DiffIndicators,
  DiffStyle,
  HunkSeparatorStyle,
  OverflowMode,
} from "../types";

const ROW_CLASS =
  "flex w-full items-center justify-between gap-3 px-2 py-1.5 text-xs";

const HUNK_OPTIONS: ReadonlyArray<{
  label: string;
  value: HunkSeparatorStyle;
}> = [
  { label: "Simple", value: "simple" },
  { label: "Metadata", value: "metadata" },
  { label: "Basic", value: "line-info-basic" },
  { label: "Detail", value: "line-info" },
];

type ViewMenuProps = {
  collapseMode: "expanded" | "collapsed";
  contentStyle?: CSSProperties | undefined;
  diffIndicators: DiffIndicators;
  diffStyle: DiffStyle;
  hunkSeparators: HunkSeparatorStyle;
  lineNumbers: boolean;
  onChangeCollapseMode(mode: "expanded" | "collapsed"): void;
  onChangeDiffIndicators(indicators: DiffIndicators): void;
  onChangeDiffStyle(style: DiffStyle): void;
  onChangeHunkSeparators(separators: HunkSeparatorStyle): void;
  onChangeLineNumbers(enabled: boolean): void;
  onChangeOverflow(overflow: OverflowMode): void;
  onChangeShowBackgrounds(show: boolean): void;
  onReload(): void;
  overflow: OverflowMode;
  showBackgrounds: boolean;
};

export function ViewMenu({
  collapseMode,
  contentStyle,
  diffIndicators,
  diffStyle,
  hunkSeparators,
  lineNumbers,
  onChangeCollapseMode,
  onChangeDiffIndicators,
  onChangeDiffStyle,
  onChangeHunkSeparators,
  onChangeLineNumbers,
  onChangeOverflow,
  onChangeShowBackgrounds,
  onReload,
  overflow,
  showBackgrounds,
}: ViewMenuProps) {
  const diffStyleLabel =
    diffStyle === "split" ? "Switch to unified diff" : "Switch to split diff";
  const collapseLabel =
    collapseMode === "expanded" ? "Collapse all files" : "Expand all files";

  return (
    <div className="inline-flex items-center gap-0.5">
      <Button
        aria-label={diffStyleLabel}
        aria-pressed={diffStyle === "split"}
        onClick={() =>
          onChangeDiffStyle(diffStyle === "split" ? "unified" : "split")
        }
        className="hidden md:inline-flex"
        size="icon"
        title={diffStyleLabel}
        type="button"
        variant="ghost"
      >
        {diffStyle === "split" ? (
          <IconDiffSplit aria-hidden />
        ) : (
          <IconDiffUnified aria-hidden />
        )}
      </Button>
      <Button
        aria-label={collapseLabel}
        aria-pressed={collapseMode === "collapsed"}
        onClick={() =>
          onChangeCollapseMode(
            collapseMode === "expanded" ? "collapsed" : "expanded"
          )
        }
        size="icon"
        title={collapseLabel}
        type="button"
        variant="ghost"
      >
        {collapseMode === "expanded" ? (
          <IconExpandAll aria-hidden />
        ) : (
          <IconCollapsedRow aria-hidden />
        )}
      </Button>
      <Button
        aria-label="Reload diff"
        className="hidden md:inline-flex"
        onClick={onReload}
        size="icon"
        title="Reload diff"
        type="button"
        variant="ghost"
      >
        <IconRefresh aria-hidden />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="View settings"
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground aria-expanded:bg-muted"
        >
          <IconGearFill aria-hidden className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60" style={contentStyle}>
          <SwitchRow
            checked={showBackgrounds}
            label="Backgrounds"
            onChange={onChangeShowBackgrounds}
          />
          <SwitchRow
            checked={lineNumbers}
            label="Line numbers"
            onChange={onChangeLineNumbers}
          />
          <SwitchRow
            checked={overflow === "wrap"}
            label="Word wrap"
            onChange={(next) => onChangeOverflow(next ? "wrap" : "scroll")}
          />
          <DropdownMenuSeparator />
          <ToggleRow label="Indicators">
            <ToggleGroup<DiffIndicators>
              onValueChange={onChangeDiffIndicators}
              value={diffIndicators}
            >
              <ToggleGroupItem size="icon" value="bars">
                <IconCodeStyleBars aria-hidden />
              </ToggleGroupItem>
              <ToggleGroupItem size="icon" value="classic">
                <IconSymbolDiffstat aria-hidden />
              </ToggleGroupItem>
              <ToggleGroupItem size="icon" value="none">
                <IconEyeSlash aria-hidden />
              </ToggleGroupItem>
            </ToggleGroup>
          </ToggleRow>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/80">
            Hunk separator
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup
            onValueChange={(v) =>
              onChangeHunkSeparators(v as HunkSeparatorStyle)
            }
            value={hunkSeparators}
          >
            {HUNK_OPTIONS.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function SwitchRow({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange(next: boolean): void;
}) {
  return (
    <DropdownMenuItem
      className={cn(ROW_CLASS, "cursor-pointer")}
      closeOnClick={false}
      onClick={() => onChange(!checked)}
    >
      <span className="flex-1">{label}</span>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        onClick={(event) => event.stopPropagation()}
      />
    </DropdownMenuItem>
  );
}

function ToggleRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <DropdownMenuItem
      className="cursor-default p-0 focus:bg-transparent"
      closeOnClick={false}
    >
      <div className={ROW_CLASS}>
        <span className="flex-1">{label}</span>
        {children}
      </div>
    </DropdownMenuItem>
  );
}
