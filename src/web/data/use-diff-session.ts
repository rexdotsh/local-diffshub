import type { CodeViewItem } from "@pierre/diffs";
import type { CodeViewHandle } from "@pierre/diffs/react";
import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type { DiffMode } from "../../shared/api";
import { createDiffRequest, streamDiff } from "../api";
import { createGitPatchFileStreamParser } from "../git-patch-stream";
import {
  appendFileText,
  createDiffAccumulator,
  type DiffAccumulator,
  type DiffStats,
  snapshotTreeSource,
  type TreeSource,
} from "./accumulator";

const PUBLISH_FILE_BATCH = 12;
const PUBLISH_INTERVAL_MS = 80;
const INITIAL_PUBLISH_FILE_BATCH = 24;
const INITIAL_PUBLISH_INTERVAL_MS = 250;

export type LoadState = "idle" | "streaming" | "ready" | "empty" | "error";

export type DiffSession = {
  error: string | null;
  items: readonly CodeViewItem[];
  loadState: LoadState;
  reload(): void;
  stats: DiffStats | null;
  treeSource: TreeSource | null;
  viewerKey: number;
  viewerRef: RefObject<CodeViewHandle<undefined> | null>;
};

type DiffSessionInput = {
  branch: string | undefined;
  commit: string | undefined;
  enabled: boolean;
  mode: DiffMode;
  path: string;
};

const EMPTY_ITEMS: readonly CodeViewItem[] = [];

export function useDiffSession({
  branch,
  commit,
  enabled,
  mode,
  path,
}: DiffSessionInput): DiffSession {
  const [items, setItems] = useState<readonly CodeViewItem[]>(EMPTY_ITEMS);
  const [treeSource, setTreeSource] = useState<TreeSource | null>(null);
  const [stats, setStats] = useState<DiffStats | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [viewerKey, setViewerKey] = useState(0);
  const [reloadVersion, setReloadVersion] = useState(0);
  const viewerRef = useRef<CodeViewHandle<undefined> | null>(null);

  const reload = useCallback(() => {
    setReloadVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    const reset = (state: LoadState) => {
      setItems(EMPTY_ITEMS);
      setTreeSource(null);
      setStats(null);
      setError(null);
      setLoadState(state);
    };

    if (!enabled) {
      reset("idle");
      return;
    }
    if (mode === "branch" && (branch == null || branch === "")) {
      reset("empty");
      return;
    }
    if (mode === "commit" && (commit == null || commit === "")) {
      reset("empty");
      return;
    }

    const controller = new AbortController();
    const accumulator = createDiffAccumulator();
    setItems(EMPTY_ITEMS);
    setTreeSource(null);
    setStats(null);
    setError(null);
    setLoadState("streaming");
    setViewerKey((key) => key + 1);

    loadDiffStream({
      accumulator,
      branch,
      cacheKeyPrefix: `${path}\u0000${mode}\u0000${branch ?? ""}\u0000${commit ?? ""}\u0000${reloadVersion}`,
      commit,
      controller,
      mode,
      onComplete(empty) {
        setStats({ ...accumulator.stats });
        setLoadState(empty ? "empty" : "ready");
      },
      onError(message) {
        setError(message);
        setLoadState("error");
      },
      onPublish(newItems) {
        setItems((current) => [...current, ...newItems]);
        setTreeSource(snapshotTreeSource(accumulator));
        setStats({ ...accumulator.stats });
      },
      path,
    });

    return () => controller.abort();
  }, [branch, commit, enabled, mode, path, reloadVersion]);

  return {
    error,
    items,
    loadState,
    reload,
    stats,
    treeSource,
    viewerKey,
    viewerRef,
  };
}

type LoadDiffStreamInput = {
  accumulator: DiffAccumulator;
  branch: string | undefined;
  cacheKeyPrefix: string;
  commit: string | undefined;
  controller: AbortController;
  mode: DiffMode;
  onComplete(empty: boolean): void;
  onError(message: string): void;
  onPublish(items: CodeViewItem[]): void;
  path: string;
};

async function loadDiffStream({
  accumulator,
  branch,
  cacheKeyPrefix,
  commit,
  controller,
  mode,
  onComplete,
  onError,
  onPublish,
  path,
}: LoadDiffStreamInput): Promise<void> {
  try {
    const response = await streamDiff(
      createDiffRequest(path, mode, branch, commit),
      controller.signal
    );
    if (controller.signal.aborted) {
      return;
    }
    if (response.body == null) {
      onComplete(true);
      return;
    }

    const parser = createGitPatchFileStreamParser();
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let pending: CodeViewItem[] = [];
    let hasPublished = false;
    let lastPublish = performance.now();

    const publish = () => {
      if (pending.length === 0) {
        return;
      }
      onPublish(pending);
      pending = [];
      hasPublished = true;
      lastPublish = performance.now();
    };

    const maybePublish = () => {
      if (pending.length === 0) {
        return;
      }
      const elapsed = performance.now() - lastPublish;
      const target = hasPublished
        ? PUBLISH_FILE_BATCH
        : INITIAL_PUBLISH_FILE_BATCH;
      const interval = hasPublished
        ? PUBLISH_INTERVAL_MS
        : INITIAL_PUBLISH_INTERVAL_MS;
      if (pending.length >= target || elapsed >= interval) {
        publish();
      }
    };

    const drainParser = () => {
      for (;;) {
        const fileText = parser.takeAvailableFile();
        if (fileText == null) {
          break;
        }
        const item = appendFileText(accumulator, fileText, cacheKeyPrefix);
        if (item != null) {
          pending.push(item);
        }
      }
      maybePublish();
    };

    try {
      for (;;) {
        if (controller.signal.aborted) {
          return;
        }
        const result = await reader.read();
        if (result.done) {
          break;
        }
        parser.push(decoder.decode(result.value, { stream: true }));
        drainParser();
      }

      const tail = decoder.decode();
      if (tail.length > 0) {
        parser.push(tail);
      }
      const finalFile = parser.finish();
      if (finalFile != null) {
        const item = appendFileText(accumulator, finalFile, cacheKeyPrefix);
        if (item != null) {
          pending.push(item);
        }
      }
      drainParser();
      publish();

      if (controller.signal.aborted) {
        return;
      }
      onComplete(accumulator.fileIndex === 0);
    } finally {
      try {
        reader.releaseLock();
      } catch {
        // Reader may already be released after cancel; ignore.
      }
    }
  } catch (loadError) {
    if (controller.signal.aborted) {
      return;
    }
    onError(
      loadError instanceof Error ? loadError.message : "Unable to load diff."
    );
  }
}
