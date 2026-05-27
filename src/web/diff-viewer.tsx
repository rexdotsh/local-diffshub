import { type CodeViewItem, processFile } from "@pierre/diffs";
import { CodeView } from "@pierre/diffs/react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import type { DiffMode } from "../shared/api";
import { createDiffRequest, streamDiff } from "./api";
import { createGitPatchFileStreamParser } from "./git-patch-stream";

type DiffViewerProps = {
  branch: string | undefined;
  mode: DiffMode;
  path: string;
};

type ViewerState = "idle" | "loading" | "ready" | "empty" | "error";

export function DiffViewer({ branch, mode, path }: DiffViewerProps) {
  const [items, setItems] = useState<CodeViewItem[]>([]);
  const [state, setState] = useState<ViewerState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setItems([]);
    setError(null);
    setState("loading");

    async function loadDiff() {
      try {
        if (mode === "branch" && (branch == null || branch === "")) {
          setState("empty");
          return;
        }

        const response = await streamDiff(
          createDiffRequest(path, mode, branch),
          controller.signal
        );
        if (controller.signal.aborted) {
          return;
        }
        const nextItems = await readDiffItems(response, controller.signal);
        if (controller.signal.aborted) {
          return;
        }
        setItems(nextItems);
        setState(nextItems.length === 0 ? "empty" : "ready");
      } catch (loadError) {
        if (controller.signal.aborted) {
          return;
        }
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load diff."
        );
        setState("error");
      }
    }

    loadDiff().catch((loadError: unknown) => {
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load diff."
      );
      setState("error");
    });

    return () => controller.abort();
  }, [branch, mode, path]);

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="font-semibold text-lg">Diff viewer</h2>
          <p className="text-muted-foreground text-sm">
            Rendered with @pierre/diffs.
          </p>
        </div>
        <Badge variant="secondary">{state}</Badge>
      </div>
      {state === "error" ? (
        <p className="p-4 text-destructive text-sm">{error}</p>
      ) : state === "empty" ? (
        <p className="p-4 text-muted-foreground text-sm">
          No diff for this mode.
        </p>
      ) : state === "loading" ? (
        <p className="p-4 text-muted-foreground text-sm">Loading diff...</p>
      ) : (
        <CodeView
          disableWorkerPool
          items={items}
          options={{
            diffStyle: "split",
          }}
          style={{ height: "calc(100svh - 16rem)" }}
        />
      )}
    </div>
  );
}

async function readDiffItems(
  response: Response,
  signal: AbortSignal
): Promise<CodeViewItem[]> {
  if (response.body == null) {
    return [];
  }

  const reader = response.body.getReader();
  const cancelReader = () => {
    reader.cancel().catch(() => undefined);
  };
  const decoder = new TextDecoder();
  const parser = createGitPatchFileStreamParser();
  const items: CodeViewItem[] = [];

  try {
    signal.addEventListener("abort", cancelReader, { once: true });
    for (;;) {
      if (signal.aborted) {
        return [];
      }
      const result = await reader.read();
      if (result.done) {
        break;
      }
      parser.push(decoder.decode(result.value, { stream: true }));
      takeParsedItems(parser, items);
    }

    const finalText = decoder.decode();
    if (finalText.length > 0) {
      parser.push(finalText);
    }
    const finalFile = parser.finish();
    if (finalFile != null) {
      appendItem(finalFile, items);
    }
    takeParsedItems(parser, items);
    return items;
  } finally {
    signal.removeEventListener("abort", cancelReader);
    reader.releaseLock();
  }
}

function takeParsedItems(
  parser: ReturnType<typeof createGitPatchFileStreamParser>,
  items: CodeViewItem[]
): void {
  for (;;) {
    const fileText = parser.takeAvailableFile();
    if (fileText == null) {
      break;
    }
    appendItem(fileText, items);
  }
}

function appendItem(fileText: string, items: CodeViewItem[]): void {
  const fileDiff = processFile(fileText, { isGitDiff: true });
  if (fileDiff == null) {
    return;
  }

  items.push({
    fileDiff,
    id: fileDiff.name || `diff-${items.length}`,
    type: "diff",
    version: 0,
  });
}
