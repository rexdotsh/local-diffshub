import {
  IconDiffSplit,
  IconDiffUnified,
  IconGearFill,
  IconRefresh,
} from "@pierre/icons";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DiffStyle, OverflowMode } from "../types";

type ViewMenuProps = {
  diffStyle: DiffStyle;
  onChangeDiffStyle(style: DiffStyle): void;
  onChangeOverflow(overflow: OverflowMode): void;
  onReload(): void;
  overflow: OverflowMode;
};

export function ViewMenu({
  diffStyle,
  onChangeDiffStyle,
  onChangeOverflow,
  onReload,
  overflow,
}: ViewMenuProps) {
  const diffStyleLabel =
    diffStyle === "split" ? "Switch to unified diff" : "Switch to split diff";

  return (
    <div className="inline-flex items-center gap-1">
      <Button
        aria-label={diffStyleLabel}
        aria-pressed={diffStyle === "split"}
        onClick={() =>
          onChangeDiffStyle(diffStyle === "split" ? "unified" : "split")
        }
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
        aria-label="Reload diff"
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
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            className="justify-between"
            onClick={() =>
              onChangeOverflow(overflow === "wrap" ? "scroll" : "wrap")
            }
          >
            <span>Line wrap</span>
            <span className="text-[10px] text-muted-foreground">
              {overflow === "wrap" ? "on" : "off"}
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="justify-between"
            onClick={() =>
              onChangeDiffStyle(diffStyle === "split" ? "unified" : "split")
            }
          >
            <span>Diff style</span>
            <span className="text-[10px] text-muted-foreground">
              {diffStyle}
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
