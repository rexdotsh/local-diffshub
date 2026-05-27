import { type CodeViewItem, processFile } from "@pierre/diffs";
import { CodeView, type CodeViewHandle } from "@pierre/diffs/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { DiffMode } from "../shared/api";
import { createDiffRequest, streamDiff } from "./api";
import { createGitPatchFileStreamParser } from "./git-patch-stream";

type DiffViewerProps = {
  branch: string | undefined;
  commit: string | undefined;
  diffStyle: DiffStyle;
  mode: DiffMode;
  overflow: OverflowMode;
  path: string;
  refreshKey: number;
  onDiffStyleChange(diffStyle: DiffStyle): void;
  onOverflowChange(overflow: OverflowMode): void;
};

type ViewerState = "idle" | "loading" | "ready" | "empty" | "error";
export type DiffStyle = "split" | "unified";
export type OverflowMode = "scroll" | "wrap";
type FileSummary = {
  additions: number;
  deletions: number;
  id: string;
  name: string;
  status: string;
};

export function DiffViewer({
  branch,
  commit,
  diffStyle,
  mode,
  overflow,
  onDiffStyleChange,
  onOverflowChange,
  path,
  refreshKey,
}: DiffViewerProps) {
  const codeViewRef = useRef<CodeViewHandle<undefined>>(null);
  const [items, setItems] = useState<CodeViewItem[]>([]);
  const [state, setState] = useState<ViewerState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const lastDiffIdentityRef = useRef<string | null>(null);
  const fileSummaries = useMemo(() => summarizeItems(items), [items]);
  const codeViewOptions = useMemo(
    () => ({ diffStyle, overflow }),
    [diffStyle, overflow]
  );
  const diffRequestState = useMemo(
    () => ({ branch, commit, mode, path, refreshKey, refreshVersion }),
    [branch, commit, mode, path, refreshKey, refreshVersion]
  );

  useEffect(() => {
    const controller = new AbortController();
    const diffIdentity = [
      diffRequestState.path,
      diffRequestState.mode,
      diffRequestState.branch ?? "",
      diffRequestState.commit ?? "",
    ].join("\0");
    const isNewDiff = lastDiffIdentityRef.current !== diffIdentity;
    lastDiffIdentityRef.current = diffIdentity;
    if (isNewDiff) {
      setItems([]);
      setSelectedFileId(null);
    }
    setError(null);
    setState("loading");

    async function loadDiff() {
      try {
        if (
          diffRequestState.mode === "branch" &&
          (diffRequestState.branch == null || diffRequestState.branch === "")
        ) {
          setState("empty");
          return;
        }
        if (
          diffRequestState.mode === "commit" &&
          (diffRequestState.commit == null || diffRequestState.commit === "")
        ) {
          setState("empty");
          return;
        }

        const response = await streamDiff(
          createDiffRequest(
            diffRequestState.path,
            diffRequestState.mode,
            diffRequestState.branch,
            diffRequestState.commit
          ),
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
        setSelectedFileId((current) =>
          current != null && nextItems.some((item) => item.id === current)
            ? current
            : (nextItems[0]?.id ?? null)
        );
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

    loadDiff();

    return () => controller.abort();
  }, [diffRequestState]);

  const selectFile = (id: string) => {
    setSelectedFileId(id);
    codeViewRef.current?.scrollTo({ align: "start", id, type: "item" });
  };

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <h2 className="font-semibold text-lg">Diff viewer</h2>
          <p className="text-muted-foreground text-sm">
            {modeLabel(mode, branch, commit)} rendered with @pierre/diffs.
          </p>
        </div>
        <div
          aria-label="Diff viewer controls"
          className="flex flex-wrap items-center gap-2"
          role="group"
        >
          <Button
            aria-pressed={diffStyle === "split"}
            size="sm"
            type="button"
            variant={diffStyle === "split" ? "default" : "outline"}
            onClick={() => onDiffStyleChange("split")}
          >
            Split
          </Button>
          <Button
            aria-pressed={diffStyle === "unified"}
            size="sm"
            type="button"
            variant={diffStyle === "unified" ? "default" : "outline"}
            onClick={() => onDiffStyleChange("unified")}
          >
            Unified
          </Button>
          <Button
            aria-pressed={overflow === "wrap"}
            size="sm"
            type="button"
            variant={overflow === "wrap" ? "default" : "outline"}
            onClick={() =>
              onOverflowChange(overflow === "wrap" ? "scroll" : "wrap")
            }
          >
            {overflow === "wrap" ? "Line wrap on" : "Line wrap off"}
          </Button>
          <Button
            size="sm"
            type="button"
            variant="outline"
            onClick={() => setRefreshVersion((version) => version + 1)}
          >
            Reload
          </Button>
          <Badge variant="secondary">{state}</Badge>
          <Badge variant="secondary">{fileSummaries.length} files</Badge>
        </div>
      </div>
      {state === "error" ? (
        <p className="p-4 text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : state === "empty" ? (
        <p className="p-4 text-muted-foreground text-sm">
          No diff for this mode.
        </p>
      ) : state === "loading" && items.length === 0 ? (
        <p className="p-4 text-muted-foreground text-sm">Loading diff...</p>
      ) : (
        <div className="grid min-h-0 grid-cols-1 lg:grid-cols-[18rem_1fr]">
          <FileNavigator
            files={fileSummaries}
            selectedFileId={selectedFileId}
            onSelectFile={selectFile}
          />
          <div className="min-w-0 border-t lg:border-t-0 lg:border-l">
            <CodeView
              ref={codeViewRef}
              disableWorkerPool
              items={items}
              options={codeViewOptions}
              style={{ height: "calc(100svh - 16rem)" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function FileNavigator({
  files,
  selectedFileId,
  onSelectFile,
}: {
  files: FileSummary[];
  selectedFileId: string | null;
  onSelectFile(id: string): void;
}) {
  return (
    <nav aria-label="Changed files" className="bg-sidebar/40">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="font-medium text-sm">Files</span>
        <Badge variant="secondary">{files.length}</Badge>
      </div>
      <Separator />
      <ScrollArea className="max-h-80 lg:h-[calc(100svh-18.8rem)] lg:max-h-none">
        <ul className="space-y-1 p-2">
          {files.map((file) => (
            <li key={file.id}>
              <button
                aria-current={selectedFileId === file.id ? "true" : undefined}
                className="w-full rounded-md px-2 py-2 text-left text-sm hover:bg-sidebar-accent aria-current:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => onSelectFile(file.id)}
                type="button"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{file.name}</span>
                  <Badge variant="secondary">{file.status}</Badge>
                </div>
                <div className="mt-1 flex gap-2 text-muted-foreground text-xs">
                  <span className="text-emerald-600">+{file.additions}</span>
                  <span className="text-red-600">-{file.deletions}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </nav>
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

function summarizeItems(items: readonly CodeViewItem[]): FileSummary[] {
  return items.flatMap((item) => {
    if (item.type !== "diff") {
      return [];
    }

    return [
      {
        additions: countLines(item.fileDiff, "addition"),
        deletions: countLines(item.fileDiff, "deletion"),
        id: item.id,
        name: item.fileDiff.name,
        status: item.fileDiff.type,
      },
    ];
  });
}

function countLines(
  fileDiff: Extract<CodeViewItem, { type: "diff" }>["fileDiff"],
  type: "addition" | "deletion"
): number {
  return fileDiff.hunks.reduce(
    (count, hunk) =>
      count + (type === "addition" ? hunk.additionLines : hunk.deletionLines),
    0
  );
}

function modeLabel(
  mode: DiffMode,
  branch: string | undefined,
  commit: string | undefined
): string {
  if (mode === "branch") {
    return branch == null ? "Branch review" : `Branch review for ${branch}`;
  }

  if (mode === "commit") {
    return commit == null ? "Commit review" : `Commit review for ${commit}`;
  }

  if (mode === "combined") {
    return "Worktree changes";
  }

  if (mode === "full") {
    return "Full review";
  }

  return mode === "staged" ? "Staged changes" : "Unstaged changes";
}
