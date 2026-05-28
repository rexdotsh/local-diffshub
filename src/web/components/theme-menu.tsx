import {
  IconCheck,
  IconChevronSm,
  IconColorAuto,
  IconColorDark,
  IconColorLight,
} from "@pierre/icons";
import { type CSSProperties, useLayoutEffect, useRef, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import {
  type ColorMode,
  DARK_THEMES,
  type DarkTheme,
  LIGHT_THEMES,
  type LightTheme,
} from "../data/themes";

const COLOR_MODE_ICON: Record<ColorMode, typeof IconColorAuto> = {
  system: IconColorAuto,
  light: IconColorLight,
  dark: IconColorDark,
};

type ThemeMenuProps = {
  colorMode: ColorMode;
  contentStyle?: CSSProperties | undefined;
  darkTheme: DarkTheme;
  lightTheme: LightTheme;
  onChangeColorMode(mode: ColorMode): void;
  onChangeDarkTheme(theme: DarkTheme): void;
  onChangeLightTheme(theme: LightTheme): void;
};

export function ThemeMenu({
  colorMode,
  contentStyle,
  darkTheme,
  lightTheme,
  onChangeColorMode,
  onChangeDarkTheme,
  onChangeLightTheme,
}: ThemeMenuProps) {
  const TriggerIcon = COLOR_MODE_ICON[colorMode];
  const [view, setView] = useState<"main" | "light" | "dark">("main");

  return (
    <DropdownMenu
      modal={false}
      onOpenChange={(open) => !open && setView("main")}
    >
      <DropdownMenuTrigger
        aria-label="Theme settings"
        className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground aria-expanded:bg-muted"
        title="Theme settings"
      >
        <TriggerIcon aria-hidden className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60" style={contentStyle}>
        {view === "main" ? (
          <>
            <div className="p-0.5">
              <ToggleGroup<ColorMode>
                className="w-full"
                onValueChange={onChangeColorMode}
                value={colorMode}
              >
                {(["system", "light", "dark"] as const).map((mode) => {
                  const Icon = COLOR_MODE_ICON[mode];
                  return (
                    <ToggleGroupItem
                      className="flex-1 justify-center gap-1.5 capitalize"
                      key={mode}
                      value={mode}
                    >
                      <Icon aria-hidden className="size-3" />
                      {mode === "system" ? "Auto" : mode}
                    </ToggleGroupItem>
                  );
                })}
              </ToggleGroup>
            </div>
            <DropdownMenuSeparator />
            <ThemeRow
              hint="Light"
              label={lightTheme}
              onSelect={() => setView("light")}
            />
            <ThemeRow
              hint="Dark"
              label={darkTheme}
              onSelect={() => setView("dark")}
            />
          </>
        ) : (
          <ThemeList
            current={view === "light" ? lightTheme : darkTheme}
            onBack={() => setView("main")}
            onPick={(theme) => {
              if (view === "light") {
                onChangeLightTheme(theme as LightTheme);
                onChangeColorMode("light");
              } else {
                onChangeDarkTheme(theme as DarkTheme);
                onChangeColorMode("dark");
              }
              setView("main");
            }}
            view={view}
          />
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ThemeRow({
  hint,
  label,
  onSelect,
}: {
  hint: string;
  label: string;
  onSelect(): void;
}) {
  return (
    <DropdownMenuItem
      className="cursor-pointer items-center gap-2 py-1.5 pr-1.5"
      closeOnClick={false}
      onClick={onSelect}
    >
      <span className="w-9 shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground/70">
        {hint}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <IconChevronSm
        aria-hidden
        className="size-3 -rotate-90 text-muted-foreground/70"
      />
    </DropdownMenuItem>
  );
}

function ThemeList({
  current,
  onBack,
  onPick,
  view,
}: {
  current: string;
  onBack(): void;
  onPick(theme: string): void;
  view: "light" | "dark";
}) {
  const isLight = view === "light";
  const themes = isLight ? LIGHT_THEMES : DARK_THEMES;
  const HeaderIcon = isLight ? IconColorLight : IconColorDark;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLDivElement | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-scroll on view swap.
  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    const selected = selectedItemRef.current;
    if (container == null || selected == null) return;
    const offset =
      selected.getBoundingClientRect().top -
      container.getBoundingClientRect().top +
      container.scrollTop;
    container.scrollTop = Math.max(0, offset - selected.offsetHeight);
  }, [view]);

  return (
    <>
      <DropdownMenuItem
        className="cursor-pointer items-center gap-2"
        closeOnClick={false}
        onClick={onBack}
      >
        <IconChevronSm
          aria-hidden
          className="size-3 rotate-90 text-muted-foreground"
        />
        <HeaderIcon aria-hidden className="size-3" />
        <span className="flex-1 truncate">
          {isLight ? "Light theme" : "Dark theme"}
        </span>
      </DropdownMenuItem>
      <div className="-mx-1 my-1 h-px bg-border/50" />
      <div
        className="cv-scrollbar max-h-72 overflow-y-auto overscroll-contain"
        ref={scrollContainerRef}
      >
        {themes.map((theme) => {
          const selected = current === theme;
          return (
            <DropdownMenuItem
              className={cn(
                "justify-between gap-2 pr-1.5",
                selected && "bg-accent/60"
              )}
              key={theme}
              onClick={() => onPick(theme)}
              ref={selected ? selectedItemRef : undefined}
            >
              <span className="flex-1 truncate">{theme}</span>
              {selected ? (
                <IconCheck aria-hidden className="size-3" />
              ) : (
                <span aria-hidden className="size-3" />
              )}
            </DropdownMenuItem>
          );
        })}
      </div>
    </>
  );
}
