import type { DiffsThemeNames } from "@pierre/diffs";
import type {
  FileTreeBatchOperation,
  FileTree as FileTreeModel,
  FileTreeOptions,
  FileTreeSortComparator,
} from "@pierre/trees";
import { FileTree, useFileTree } from "@pierre/trees/react";
import {
  type CSSProperties,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";

import type { TreeSource } from "../data/accumulator";
import { useResolvedTreeThemeStyles } from "../data/use-theme-chrome";

const TREE_ITEM_HEIGHT = 24;

// Preserve input order so the sidebar follows the patch sequence.
const PRESERVE_INPUT_ORDER_SORT: FileTreeSortComparator = () => 0;

const DENSITY_OVERRIDE_STYLES: CSSProperties = {
  "--trees-density-override": 0.8,
  "--trees-padding-inline-override": 8,
  "--trees-git-renamed-color-override": "light-dark(#007aff, #007aff)",
} as CSSProperties;

const TREE_UNSAFE_CSS = `
[data-file-tree-virtualized-scroll='true'] {
  padding-inline-start: 0;
  padding-inline-end: 0;
  margin-inline-end: 0;
}
[data-file-tree-search-container][data-open='false'] { display: none; }
[data-file-tree-search-container] {
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 6px;
  padding-block: 6px;
  padding-inline-end: 6px;
}
[data-item-section='content'] [data-truncate-container] {
  height: auto;
  overflow: hidden;
}
[data-item-section='content'] [data-truncate-grid] {
  display: block;
  min-width: 0;
}
[data-item-section='content'] [data-truncate-marker-cell],
[data-item-section='content'] [data-truncate-content='overflow'] {
  display: none;
}
[data-item-section='content'] [data-truncate-content='visible'] {
  direction: ltr;
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
[data-item-contains-git-change='true'] > [data-item-section='git'] { display: none; }
[data-item-type='folder'] {
  color: color-mix(in lab, light-dark(#000, #fff) 25%, var(--trees-fg));
  font-weight: 500;
}
`;

const BASE_FILE_TREE_OPTIONS = {
  flattenEmptyDirectories: true,
  id: "diffhub-file-tree",
  initialExpansion: "open",
  itemHeight: TREE_ITEM_HEIGHT,
  search: true,
  sort: PRESERVE_INPUT_ORDER_SORT,
  stickyFolders: false,
  unsafeCSS: TREE_UNSAFE_CSS,
} as const satisfies Partial<FileTreeOptions>;

type DiffFileTreeProps = {
  darkTheme: DiffsThemeNames;
  lightTheme: DiffsThemeNames;
  onModelReady(model: FileTreeModel | null): void;
  onSelectPath(itemId: string, filePath: string): void;
  resolvedColorMode: "light" | "dark";
  selectedPath: string | undefined;
  source: TreeSource;
};

export const DiffFileTree = memo(function DiffFileTree({
  darkTheme,
  lightTheme,
  onModelReady,
  onSelectPath,
  resolvedColorMode,
  selectedPath,
  source,
}: DiffFileTreeProps) {
  const sourceRef = useRef(source);
  const previousSourceRef = useRef(source);
  const onSelectPathRef = useRef(onSelectPath);
  sourceRef.current = source;
  onSelectPathRef.current = onSelectPath;

  const themeStyles = useResolvedTreeThemeStyles(
    lightTheme,
    darkTheme,
    resolvedColorMode
  );
  const mergedStyles = useMemo<CSSProperties>(
    () => ({ ...themeStyles, ...DENSITY_OVERRIDE_STYLES }),
    [themeStyles]
  );

  const initialPathsRef = useRef<readonly string[] | null>(null);
  initialPathsRef.current ??= source.paths.slice(0, source.pathCount);

  const handleSelectionChange = useCallback(
    (selectedPaths: readonly string[]) => {
      if (selectedPaths.length !== 1) {
        return;
      }
      const [first] = selectedPaths;
      if (first == null) return;
      const itemId = sourceRef.current.pathToItemId.get(first);
      if (itemId != null) {
        onSelectPathRef.current(itemId, first);
      }
    },
    []
  );

  const { model } = useFileTree({
    ...BASE_FILE_TREE_OPTIONS,
    gitStatus: source.gitStatus,
    onSelectionChange: handleSelectionChange,
    paths: initialPathsRef.current,
  });

  useEffect(() => {
    const previous = previousSourceRef.current;
    if (previous === source) {
      return;
    }
    previousSourceRef.current = source;
    syncTreeModel(model, previous, source);
  }, [model, source]);

  useEffect(() => {
    onModelReady(model);
    return () => onModelReady(null);
  }, [model, onModelReady]);

  useEffect(() => {
    for (const path of model.getSelectedPaths()) {
      if (path !== selectedPath) model.getItem(path)?.deselect();
    }
    if (selectedPath != null && source.pathToItemId.has(selectedPath)) {
      model.getItem(selectedPath)?.select();
      model.scrollToPath(selectedPath, { offset: "nearest" });
    }
  }, [model, selectedPath, source]);

  return (
    <FileTree
      className="ml-2 h-full min-h-0 overflow-auto overscroll-contain"
      model={model}
      style={mergedStyles}
    />
  );
});

function syncTreeModel(
  model: FileTreeModel,
  previous: TreeSource,
  next: TreeSource
): void {
  const canAppend =
    next.previousSource === previous && next.pathCount >= previous.pathCount;
  if (canAppend) {
    if (next.pathCount > previous.pathCount) {
      const operations: FileTreeBatchOperation[] = [];
      for (let index = previous.pathCount; index < next.pathCount; index++) {
        const path = next.paths[index];
        if (path != null) {
          operations.push({ path, type: "add" });
        }
      }
      if (operations.length > 0) {
        model.batch(operations);
      }
    }
    model.setGitStatus(next.gitStatus);
    return;
  }
  model.resetPaths(next.paths.slice(0, next.pathCount));
  model.setGitStatus(next.gitStatus);
}
