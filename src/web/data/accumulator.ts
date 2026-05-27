import {
  type ChangeTypes,
  type CodeViewItem,
  type FileDiffMetadata,
  processFile,
} from "@pierre/diffs";
import type { GitStatus, GitStatusEntry } from "@pierre/trees";

export type DiffStats = {
  addedLines: number;
  deletedLines: number;
  fileCount: number;
};

export type TreeSource = {
  gitStatus: readonly GitStatusEntry[];
  pathCount: number;
  paths: readonly string[];
  pathToItemId: ReadonlyMap<string, string>;
  // Mutated to `undefined` once a newer snapshot supersedes this one so the
  // accumulator never retains more than two snapshots at a time.
  previousSource: TreeSource | undefined;
};

export type DiffAccumulator = {
  fileIndex: number;
  gitStatusByPath: Map<string, GitStatusEntry>;
  issuedIds: Set<string>;
  lastTreeSource: TreeSource | undefined;
  pathToItemId: Map<string, string>;
  paths: string[];
  stats: DiffStats;
};

export function createDiffAccumulator(): DiffAccumulator {
  return {
    fileIndex: 0,
    gitStatusByPath: new Map(),
    issuedIds: new Set(),
    lastTreeSource: undefined,
    pathToItemId: new Map(),
    paths: [],
    stats: { addedLines: 0, deletedLines: 0, fileCount: 0 },
  };
}

export function appendFileText(
  accumulator: DiffAccumulator,
  fileText: string,
  cacheKeyPrefix: string
): CodeViewItem | null {
  const fileDiff = processFile(fileText, {
    cacheKey: `${cacheKeyPrefix}-${accumulator.fileIndex}`,
    isGitDiff: true,
  });
  if (fileDiff == null) {
    return null;
  }
  return appendFileDiff(accumulator, fileDiff);
}

export function snapshotTreeSource(accumulator: DiffAccumulator): TreeSource {
  const previousSource = accumulator.lastTreeSource;
  if (previousSource != null) {
    // Break the chain so React-retained snapshots don't pin all prior history.
    previousSource.previousSource = undefined;
  }
  const snapshot: TreeSource = {
    gitStatus: Array.from(accumulator.gitStatusByPath.values()),
    pathCount: accumulator.paths.length,
    paths: accumulator.paths,
    pathToItemId: accumulator.pathToItemId,
    previousSource,
  };
  accumulator.lastTreeSource = snapshot;
  return snapshot;
}

function appendFileDiff(
  accumulator: DiffAccumulator,
  fileDiff: FileDiffMetadata
): CodeViewItem {
  accumulator.stats.fileCount++;
  for (const hunk of fileDiff.hunks) {
    accumulator.stats.addedLines += hunk.additionLines;
    accumulator.stats.deletedLines += hunk.deletionLines;
  }

  const path = fileDiff.name;
  const id = nextItemId(accumulator, path);
  accumulator.issuedIds.add(id);
  accumulator.fileIndex++;

  const item: CodeViewItem = {
    fileDiff,
    id,
    type: "diff",
    version: 0,
  };

  if (path.length === 0) {
    return item;
  }
  if (!accumulator.pathToItemId.has(path)) {
    accumulator.paths.push(path);
  }
  accumulator.pathToItemId.set(path, id);
  updateGitStatus(accumulator, path, fileDiff.type);
  return item;
}

function nextItemId(accumulator: DiffAccumulator, path: string): string {
  const base = path.length === 0 ? `diff-${accumulator.fileIndex}` : path;
  if (!accumulator.issuedIds.has(base)) {
    return base;
  }
  let suffix = 2;
  while (accumulator.issuedIds.has(`${base}~${suffix}`)) {
    suffix++;
  }
  return `${base}~${suffix}`;
}

function mapChangeTypeToGitStatus(type: ChangeTypes): GitStatus {
  switch (type) {
    case "new":
      return "added";
    case "deleted":
      return "deleted";
    case "rename-pure":
    case "rename-changed":
      return "renamed";
    default:
      return "modified";
  }
}

function updateGitStatus(
  accumulator: DiffAccumulator,
  path: string,
  type: ChangeTypes
): void {
  const status = mapChangeTypeToGitStatus(type);
  if (status === "modified") {
    accumulator.gitStatusByPath.delete(path);
    return;
  }
  accumulator.gitStatusByPath.set(path, { path, status });
}
