import darkSoftTheme from "@pierre/theme/pierre-dark-soft";
import {
  type FileTreeBatchOperation,
  type FileTree as FileTreeModel,
  type FileTreeOptions,
  themeToTreeStyles,
} from "@pierre/trees";
import { FileTree, useFileTree } from "@pierre/trees/react";
import {
  type CSSProperties,
  memo,
  useCallback,
  useEffect,
  useRef,
} from "react";

import type { TreeSource } from "../data/accumulator";

const TREE_ITEM_HEIGHT = 24;

const PIERRE_TREE_STYLES: CSSProperties = {
  ...themeToTreeStyles(darkSoftTheme),
  // Diffhub overrides layered on top of the theme; these are the
  // documented `*-override` slots that win over Pierre's defaults.
  "--trees-bg-override": "var(--app-sidebar-bg)",
  "--trees-bg-muted-override": "var(--app-muted)",
  "--trees-density-override": 0.85,
  "--trees-padding-inline-override": 8,
  "--trees-selected-fg-override": "var(--app-foreground-strong)",
} as CSSProperties;

const TREE_UNSAFE_CSS = `
[data-file-tree-search-container][data-open='false'] { display: none; }
[data-file-tree-search-container] {
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 6px;
  padding-block: 8px;
  padding-inline: 8px;
}
[data-item-contains-git-change='true'] > [data-item-section='git'] { display: none; }
[data-item-type='folder'] {
  color: color-mix(in lab, white 25%, var(--trees-fg));
  font-weight: 500;
}
`;

const BASE_FILE_TREE_OPTIONS = {
  flattenEmptyDirectories: true,
  id: "diffhub-file-tree",
  initialExpansion: "open",
  itemHeight: TREE_ITEM_HEIGHT,
  search: true,
  stickyFolders: true,
  unsafeCSS: TREE_UNSAFE_CSS,
} as const satisfies Partial<FileTreeOptions>;

type DiffFileTreeProps = {
  onSelectPath(itemId: string): void;
  source: TreeSource;
};

export const DiffFileTree = memo(function DiffFileTree({
  onSelectPath,
  source,
}: DiffFileTreeProps) {
  const sourceRef = useRef(source);
  const previousSourceRef = useRef(source);
  const onSelectPathRef = useRef(onSelectPath);
  sourceRef.current = source;
  onSelectPathRef.current = onSelectPath;

  const initialPathsRef = useRef<readonly string[] | null>(null);
  initialPathsRef.current ??= source.paths.slice(0, source.pathCount);

  const handleSelectionChange = useCallback(
    (selectedPaths: readonly string[]) => {
      if (selectedPaths.length !== 1) {
        return;
      }
      const [first] = selectedPaths;
      const itemId =
        first == null ? undefined : sourceRef.current.pathToItemId.get(first);
      if (itemId != null) {
        onSelectPathRef.current(itemId);
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

  return (
    <FileTree
      className="h-full min-h-0 overflow-auto overscroll-contain"
      model={model}
      style={PIERRE_TREE_STYLES}
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
