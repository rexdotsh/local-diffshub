import { IconCiWarningFill, IconRefresh } from "@pierre/icons";

import { Button } from "@/components/ui/button";
import type { LoadState } from "../data/use-diff-session";

type StatusPanelProps = {
  errorMessage: string | null;
  onRetry?(): void;
  state: LoadState;
};

const TITLE_BY_STATE: Record<LoadState, string> = {
  empty: "No changes to review",
  error: "Couldn’t load diff",
  idle: "Open a project to start",
  ready: "",
  streaming: "Streaming diff",
};

const MESSAGE_BY_STATE: Record<LoadState, string> = {
  empty: "Pick another mode, branch, or commit from the header.",
  error: "Something went wrong while loading the diff.",
  idle: "Use the project switcher above to open a local Git repository.",
  ready: "",
  streaming: "Reading the patch and rendering files as they arrive…",
};

export function StatusPanel({
  errorMessage,
  onRetry,
  state,
}: StatusPanelProps) {
  const isError = state === "error";
  const isStreaming = state === "streaming";
  const title = TITLE_BY_STATE[state];
  const message = isError
    ? (errorMessage ?? MESSAGE_BY_STATE[state])
    : MESSAGE_BY_STATE[state];

  const role = isError ? "alert" : "status";
  return (
    <div className="flex h-full min-h-0 items-center justify-center p-6">
      <section
        aria-busy={isStreaming || undefined}
        aria-live={isError ? undefined : "polite"}
        className="w-full max-w-md text-center"
        role={role}
      >
        {isStreaming ? (
          <IconRefresh
            aria-hidden
            className="mx-auto mb-3 size-5 -scale-x-100 animate-spin [animation-direction:reverse] text-muted-foreground"
          />
        ) : null}
        {isError ? (
          <IconCiWarningFill
            aria-hidden
            className="mx-auto mb-3 size-5 text-amber-400"
          />
        ) : null}
        <h2 className="font-medium text-foreground text-sm">{title}</h2>
        <p className="mt-1 text-muted-foreground text-pretty text-sm">
          {message}
        </p>
        {isError && onRetry != null ? (
          <Button className="mt-4" onClick={onRetry} size="sm" type="button">
            Try again
          </Button>
        ) : null}
      </section>
    </div>
  );
}
