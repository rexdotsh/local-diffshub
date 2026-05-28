import DiffsWorker from "@pierre/diffs/worker/worker.js?worker";
import type {
  WorkerInitializationRenderOptions,
  WorkerPoolOptions,
} from "@pierre/diffs/react";

import "./custom-themes";
import { DEFAULT_DARK_THEME, DEFAULT_LIGHT_THEME } from "./themes";

const MAX_POOL_SIZE = 3;
const FALLBACK_POOL_SIZE = 2;

function resolvePoolSize(): number {
  if (typeof navigator === "undefined") {
    return FALLBACK_POOL_SIZE;
  }
  const cores = navigator.hardwareConcurrency;
  if (!Number.isFinite(cores) || cores <= 0) {
    return FALLBACK_POOL_SIZE;
  }
  return Math.max(1, Math.min(MAX_POOL_SIZE, Math.floor(cores)));
}

export const HIGHLIGHTER_OPTIONS: WorkerInitializationRenderOptions = {
  preferredHighlighter: "shiki-wasm",
  theme: { dark: DEFAULT_DARK_THEME, light: DEFAULT_LIGHT_THEME },
  useTokenTransformer: true,
};

export const WORKER_POOL_OPTIONS: WorkerPoolOptions = {
  poolSize: resolvePoolSize(),
  workerFactory: () => new DiffsWorker(),
};
