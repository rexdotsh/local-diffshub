import {
  type CodeViewItem,
  type CodeViewLineSelection,
  type CodeViewOptions,
  type SelectedLineRange,
  setLanguageOverride,
  type SupportedLanguages,
} from "@pierre/diffs";
import { CodeView, type CodeViewHandle } from "@pierre/diffs/react";
import { IconChevronSm } from "@pierre/icons";
import { type RefObject, useCallback, useMemo } from "react";

import { cn } from "@/lib/utils";
import { formatLineHash } from "../data/line-hash";
import type {
  DiffIndicators,
  DiffStyle,
  HunkSeparatorStyle,
  OverflowMode,
} from "../types";
import { LanguageMenu } from "./language-menu";

const CODE_VIEW_LAYOUT = { gap: 1, paddingBottom: 0, paddingTop: 0 };

type CodeViewWrapperProps = {
  darkTheme: string;
  diffIndicators: DiffIndicators;
  diffStyle: DiffStyle;
  hunkSeparators: HunkSeparatorStyle;
  items: readonly CodeViewItem[];
  languageOverrides: ReadonlyMap<string, SupportedLanguages>;
  lightTheme: string;
  lineNumbers: boolean;
  onClearLanguageOverride(itemId: string): void;
  onSelectedLinesChange(selection: CodeViewLineSelection | null): void;
  onSetLanguageOverride(itemId: string, language: SupportedLanguages): void;
  overflow: OverflowMode;
  selectedLines: CodeViewLineSelection | null;
  showBackgrounds: boolean;
  themeType: "light" | "dark";
  viewerKey: number;
  viewerRef: RefObject<CodeViewHandle<undefined> | null>;
};

export function CodeViewWrapper({
  darkTheme,
  diffIndicators,
  diffStyle,
  hunkSeparators,
  items,
  languageOverrides,
  lightTheme,
  lineNumbers,
  onClearLanguageOverride,
  onSelectedLinesChange,
  onSetLanguageOverride,
  overflow,
  selectedLines,
  showBackgrounds,
  themeType,
  viewerKey,
  viewerRef,
}: CodeViewWrapperProps) {
  const handleToggleItemCollapsed = useCallback(
    (itemId: string) => {
      const handle = viewerRef.current;
      const instance = handle?.getInstance();
      const item = handle?.getItem(itemId);
      if (handle == null || instance == null || item == null) return;
      // Snap to the item's top if it's already scrolled past, so the collapse
      // animation doesn't shove the next file under the cursor.
      const itemTop = instance.getTopForItem(itemId);
      item.collapsed = item.collapsed !== true;
      item.version = (typeof item.version === "number" ? item.version : 0) + 1;
      if (!handle.updateItem(item)) return;
      if (itemTop != null && itemTop < instance.getScrollTop()) {
        handle.scrollTo({ align: "start", id: item.id, type: "item" });
      }
    },
    [viewerRef]
  );

  const renderHeaderPrefix = useCallback(
    (item: CodeViewItem<undefined>) => {
      if (item.type !== "diff") return null;
      return (
        <CollapseDiffButton
          collapsed={item.collapsed}
          disabled={
            item.fileDiff.splitLineCount === 0 &&
            item.fileDiff.unifiedLineCount === 0
          }
          onToggle={() => handleToggleItemCollapsed(item.id)}
        />
      );
    },
    [handleToggleItemCollapsed]
  );

  const renderHeaderMetadata = useCallback(
    (item: CodeViewItem<undefined>) => {
      if (item.type !== "diff") return null;
      const inferred =
        languageOverrides.get(item.id) ?? item.fileDiff.lang ?? null;
      return (
        <LanguageMenu
          fileName={item.fileDiff.name}
          language={inferred}
          onClear={() => onClearLanguageOverride(item.id)}
          onSelect={(lang) => onSetLanguageOverride(item.id, lang)}
        />
      );
    },
    [languageOverrides, onClearLanguageOverride, onSetLanguageOverride]
  );

  // Apply per-item language overrides; preserve identity for unchanged items
  // so CodeView's append-only fast path still kicks in.
  const effectiveItems = useMemo<readonly CodeViewItem[]>(() => {
    if (languageOverrides.size === 0) return items;
    return items.map((item) => {
      if (item.type !== "diff") return item;
      const override = languageOverrides.get(item.id);
      if (override == null || item.fileDiff.lang === override) return item;
      return {
        ...item,
        fileDiff: setLanguageOverride(item.fileDiff, override),
      };
    });
  }, [items, languageOverrides]);

  const onGutterUtilityClick = useCallback(
    (range: SelectedLineRange, context: { item: CodeViewItem<undefined> }) => {
      if (context.item.type !== "diff") return;
      const selection = { id: context.item.id, range };
      const hash = formatLineHash(selection);
      if (hash == null) return;
      const { origin, pathname, search } = window.location;
      navigator.clipboard
        ?.writeText(`${origin}${pathname}${search}${hash}`)
        .catch(() => undefined);
      onSelectedLinesChange(selection);
    },
    [onSelectedLinesChange]
  );

  const options = useMemo<CodeViewOptions<undefined>>(
    () => ({
      diffIndicators,
      diffStyle,
      disableBackground: !showBackgrounds,
      disableLineNumbers: !lineNumbers,
      enableGutterUtility: true,
      enableLineSelection: true,
      hunkSeparators,
      layout: CODE_VIEW_LAYOUT,
      lineHoverHighlight: "number",
      onGutterUtilityClick,
      overflow,
      stickyHeaders: true,
      theme: { dark: darkTheme, light: lightTheme },
      themeType,
    }),
    [
      darkTheme,
      diffIndicators,
      diffStyle,
      hunkSeparators,
      lightTheme,
      lineNumbers,
      onGutterUtilityClick,
      overflow,
      showBackgrounds,
      themeType,
    ]
  );

  return (
    <CodeView<undefined>
      className="cv-scrollbar relative h-full min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-clip overscroll-contain [contain:strict] [overflow-anchor:none] [will-change:scroll-position]"
      items={effectiveItems}
      key={viewerKey}
      onSelectedLinesChange={onSelectedLinesChange}
      options={options}
      ref={viewerRef}
      renderHeaderMetadata={renderHeaderMetadata}
      renderHeaderPrefix={renderHeaderPrefix}
      selectedLines={selectedLines}
    />
  );
}

type CollapseDiffButtonProps = {
  collapsed?: boolean | undefined;
  disabled?: boolean | undefined;
  onToggle(): void;
};

function CollapseDiffButton({
  collapsed = false,
  disabled = false,
  onToggle,
}: CollapseDiffButtonProps) {
  return (
    <button
      aria-expanded={!disabled && !collapsed}
      aria-hidden={disabled}
      aria-label={
        disabled ? undefined : collapsed ? "Expand diff" : "Collapse diff"
      }
      className="-ml-2 inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
      disabled={disabled}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle();
      }}
      type="button"
    >
      <IconChevronSm
        aria-hidden="true"
        className={cn(
          "size-4 transition-transform",
          (disabled || collapsed) && "-rotate-90"
        )}
      />
    </button>
  );
}
