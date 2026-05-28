import { type DiffsThemeNames, getResolvedOrResolveTheme } from "@pierre/diffs";
import pierreDarkSoft from "@pierre/theme/pierre-dark-soft";
import pierreLightSoft from "@pierre/theme/pierre-light-soft";
import { themeToTreeStyles, type TreeThemeStyles } from "@pierre/trees";
import { type CSSProperties, useEffect, useMemo, useState } from "react";

import "./custom-themes";
import type { ColorMode } from "./themes";

type ResolvedShikiTheme = {
  type?: "light" | "dark";
  bg?: string;
  fg?: string;
  colors?: Record<string, string>;
};

type ResolvedTreeTheme = {
  treeStyles: TreeThemeStyles;
  primaryFg?: string | undefined;
  mutedFg?: string | undefined;
  editorBg?: string | undefined;
};

// WCAG AA: 3:1 for large/primary fg, 4.5:1 for muted body labels.
const MIN_PRIMARY_RATIO = 3;
const MIN_MUTED_RATIO = 4.5;
const BORDER_MIX = 22;

function buildResolvedTheme(theme: ResolvedShikiTheme): ResolvedTreeTheme {
  const c = theme.colors ?? {};
  const sideBarBg =
    c["sideBar.background"] ?? c["editor.background"] ?? theme.bg;
  const editorBg = c["editor.background"] ?? theme.bg ?? sideBarBg;
  const primaryFg = pickReadableForeground(sideBarBg, [
    c["sideBar.foreground"],
    c["editor.foreground"],
    theme.fg,
  ]);
  const treeStyles = themeToTreeStyles(theme as never);
  if (primaryFg != null && primaryFg !== c["sideBar.foreground"]) {
    const s = treeStyles as Record<string, string>;
    s.color = primaryFg;
    s["--trees-theme-sidebar-fg"] = primaryFg;
    if (c["sideBarSectionHeader.foreground"] == null) {
      s["--trees-theme-sidebar-header-fg"] = primaryFg;
    }
    if (c["list.activeSelectionForeground"] == null) {
      s["--trees-theme-list-active-selection-fg"] = primaryFg;
    }
  }
  return { treeStyles, primaryFg, mutedFg: c.descriptionForeground, editorBg };
}

function pickReadableForeground(
  bg: string | undefined,
  candidates: ReadonlyArray<string | undefined>
): string | undefined {
  const firstDefined = candidates.find((c) => c != null && c !== "");
  const bgL = relativeLuminance(bg);
  if (bgL == null) return firstDefined;
  let best: string | undefined;
  let bestRatio = -1;
  for (const candidate of candidates) {
    if (candidate == null || candidate === "") continue;
    const cL = relativeLuminance(candidate);
    if (cL == null) continue;
    const ratio = contrastRatio(bgL, cL);
    if (ratio >= MIN_PRIMARY_RATIO) return candidate;
    if (ratio > bestRatio) {
      best = candidate;
      bestRatio = ratio;
    }
  }
  return best ?? firstDefined;
}

function readableMuted(
  bg: string | undefined,
  primaryFg: string,
  candidate: string | undefined
): string {
  if (candidate != null && candidate !== "") {
    const composited = compositeOverBg(candidate, bg) ?? candidate;
    const cL = relativeLuminance(composited);
    const bgL = relativeLuminance(bg);
    if (cL == null || bgL == null) return candidate;
    if (contrastRatio(bgL, cL) >= MIN_MUTED_RATIO) return candidate;
  }
  return bg == null ? primaryFg : `color-mix(in srgb, ${primaryFg} 70%, ${bg})`;
}

function compositeOverBg(
  fg: string,
  bg: string | undefined
): string | undefined {
  if (bg == null) return undefined;
  const fgParts = parseHex(fg);
  const bgParts = parseHex(bg);
  if (fgParts == null || bgParts == null) return undefined;
  const [fr, fg2, fb, fa] = fgParts;
  const [br, bg3, bb] = bgParts;
  const r = Math.round(fr * fa + br * (1 - fa));
  const g = Math.round(fg2 * fa + bg3 * (1 - fa));
  const b = Math.round(fb * fa + bb * (1 - fa));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function parseHex(
  color: string
): readonly [number, number, number, number] | null {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})\b/i.exec(color.trim());
  if (match == null) return null;
  const hex = match[1] as string;
  const expanded =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex.slice(0, 6);
  const alpha =
    hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1;
  return [
    Number.parseInt(expanded.slice(0, 2), 16),
    Number.parseInt(expanded.slice(2, 4), 16),
    Number.parseInt(expanded.slice(4, 6), 16),
    alpha,
  ];
}

function relativeLuminance(color: string | undefined): number | null {
  if (color == null) return null;
  const parts = parseHex(color);
  if (parts == null) return null;
  const [r, g, b] = parts;
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.039_28 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(la: number, lb: number): number {
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

function isDarkSurface(bg: string | undefined, primaryFg: string): boolean {
  const fromBg = relativeLuminance(bg);
  if (fromBg != null) return fromBg < 0.4;
  const fromFg = relativeLuminance(primaryFg);
  return fromFg != null ? fromFg > 0.6 : false;
}

const LIGHT_SOFT_THEME = buildResolvedTheme(pierreLightSoft as never);
const DARK_SOFT_THEME = buildResolvedTheme(pierreDarkSoft as never);

// Module cache so flipping back to a previously-loaded theme is synchronous.
const RESOLVED_THEME_CACHE = new Map<string, ResolvedTreeTheme>([
  ["pierre-light-soft", LIGHT_SOFT_THEME],
  ["pierre-dark-soft", DARK_SOFT_THEME],
]);

function useResolvedThemeByName(
  themeName: DiffsThemeNames,
  fallback: ResolvedTreeTheme
): ResolvedTreeTheme {
  const cached = RESOLVED_THEME_CACHE.get(themeName);
  const [lastResolved, setLastResolved] = useState<ResolvedTreeTheme>(
    cached ?? fallback
  );

  useEffect(() => {
    const existing = RESOLVED_THEME_CACHE.get(themeName);
    if (existing != null) {
      setLastResolved(existing);
      return;
    }
    let cancelled = false;
    Promise.resolve(getResolvedOrResolveTheme(themeName))
      .then((theme) => {
        const next = buildResolvedTheme(theme as never);
        RESOLVED_THEME_CACHE.set(themeName, next);
        if (!cancelled) setLastResolved(next);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [themeName]);

  return cached ?? lastResolved;
}

function useResolvedTreeTheme(
  lightTheme: DiffsThemeNames,
  darkTheme: DiffsThemeNames,
  resolvedColorMode: "light" | "dark"
): ResolvedTreeTheme {
  const light = useResolvedThemeByName(lightTheme, LIGHT_SOFT_THEME);
  const dark = useResolvedThemeByName(darkTheme, DARK_SOFT_THEME);
  return useMemo(
    () => (resolvedColorMode === "dark" ? dark : light),
    [resolvedColorMode, dark, light]
  );
}

export function useResolvedTreeThemeStyles(
  lightTheme: DiffsThemeNames,
  darkTheme: DiffsThemeNames,
  resolvedColorMode: "light" | "dark"
): TreeThemeStyles {
  return useResolvedTreeTheme(lightTheme, darkTheme, resolvedColorMode)
    .treeStyles;
}

function buildThemeChromeStyle(
  activeTheme: ResolvedTreeTheme
): CSSProperties | undefined {
  const bg =
    typeof activeTheme.treeStyles.backgroundColor === "string" &&
    activeTheme.treeStyles.backgroundColor !== ""
      ? activeTheme.treeStyles.backgroundColor
      : undefined;
  const primaryFg =
    activeTheme.primaryFg ??
    (typeof activeTheme.treeStyles.color === "string"
      ? activeTheme.treeStyles.color
      : undefined);
  if (bg == null && primaryFg == null) return undefined;

  const style: CSSProperties & Record<string, string> = {};
  if (bg != null) style.backgroundColor = bg;
  if (primaryFg == null) return style as CSSProperties;

  const muted = readableMuted(bg, primaryFg, activeTheme.mutedFg);
  const border = `color-mix(in srgb, ${primaryFg} 20%, transparent)`;
  const borderOpaque = `color-mix(in srgb, ${primaryFg} ${BORDER_MIX}%, ${bg ?? "transparent"})`;
  const surfaceBase = bg ?? "transparent";
  const popoverBg = `color-mix(in srgb, ${primaryFg} 7%, ${surfaceBase})`;
  const popoverHoverBg = `color-mix(in srgb, ${primaryFg} 14%, ${surfaceBase})`;
  const bgOrPopover = bg ?? popoverBg;

  // Override both the Tailwind alias (--color-x) and base var (--x); the
  // @theme inline mapping bakes at build time so updating just one won't
  // propagate to utilities that reference the alias.
  const tokens: Record<string, string> = {
    color: primaryFg,
    "--color-foreground": primaryFg,
    "--foreground": primaryFg,
    "--color-muted-foreground": muted,
    "--muted-foreground": muted,
    "--color-border": border,
    "--border": border,
    "--color-border-opaque": borderOpaque,
    "--border-opaque": borderOpaque,
    "--color-popover": popoverBg,
    "--popover": popoverBg,
    "--color-popover-foreground": primaryFg,
    "--popover-foreground": primaryFg,
    "--color-card": popoverBg,
    "--card": popoverBg,
    "--color-card-foreground": primaryFg,
    "--card-foreground": primaryFg,
    "--color-background": bgOrPopover,
    "--background": bgOrPopover,
    "--color-accent": popoverHoverBg,
    "--accent": popoverHoverBg,
    "--color-accent-foreground": primaryFg,
    "--accent-foreground": primaryFg,
    "--color-secondary": popoverHoverBg,
    "--secondary": popoverHoverBg,
    "--color-secondary-foreground": primaryFg,
    "--secondary-foreground": primaryFg,
    "--color-muted": popoverHoverBg,
    "--muted": popoverHoverBg,
  };
  Object.assign(style, tokens);
  const dark = isDarkSurface(bg, primaryFg);
  style["--diffhub-add-fg"] = dark ? "#34d399" : "#047857";
  style["--diffhub-del-fg"] = dark ? "#fb7185" : "#be123c";
  return style as CSSProperties;
}

export function useThemeChromeStyle(
  lightTheme: DiffsThemeNames,
  darkTheme: DiffsThemeNames,
  resolvedColorMode: "light" | "dark"
): CSSProperties | undefined {
  const activeTheme = useResolvedTreeTheme(
    lightTheme,
    darkTheme,
    resolvedColorMode
  );
  return useMemo(() => buildThemeChromeStyle(activeTheme), [activeTheme]);
}

export function useResolvedColorMode(colorMode: ColorMode): "light" | "dark" {
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemPrefersDark(media.matches);
    const handler = (event: MediaQueryListEvent) =>
      setSystemPrefersDark(event.matches);
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);
  if (colorMode === "system") return systemPrefersDark ? "dark" : "light";
  return colorMode;
}
