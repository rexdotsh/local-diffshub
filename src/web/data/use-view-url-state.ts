import { useCallback, useEffect, useState } from "react";

import type { DiffMode } from "../../shared/api";

type ChangesScope = Extract<DiffMode, "combined" | "staged" | "unstaged">;
type View = "changes" | "branch";

export type ViewUrlState = {
  view: View;
  scope: ChangesScope;
  branch?: string;
  commit?: string;
  file?: string;
};

type ViewUrlPatch = {
  [Key in keyof ViewUrlState]?: ViewUrlState[Key] | undefined;
};
type HistoryMode = "push" | "replace";

const DEFAULT_VIEW_URL_STATE: ViewUrlState = {
  view: "changes",
  scope: "combined",
};

export function useViewUrlState(): readonly [
  ViewUrlState,
  (patch: ViewUrlPatch, historyMode?: HistoryMode) => void,
] {
  const [state, setState] = useState(readViewUrlState);

  useEffect(() => {
    const onPopState = () => setState(readViewUrlState());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const updateState = useCallback(
    (patch: ViewUrlPatch, historyMode: HistoryMode = "replace") => {
      setState((current) => {
        const next = normalizeViewUrlState({ ...current, ...patch });
        if (areEqual(current, next)) return current;
        writeViewUrlState(next, historyMode);
        return next;
      });
    },
    []
  );

  return [state, updateState];
}

function readViewUrlState(): ViewUrlState {
  return normalizeViewUrlState(Object.fromEntries(readSearchParams()));
}

function writeViewUrlState(
  state: ViewUrlState,
  historyMode: HistoryMode
): void {
  const params = readSearchParams();
  params.set("view", state.view);
  params.set("scope", state.scope);
  setOptionalParam(params, "branch", state.branch);
  setOptionalParam(params, "commit", state.commit);
  setOptionalParam(params, "file", state.file);

  const nextSearch = params.toString();
  const { hash, pathname, search } = window.location;
  const nextUrl = `${pathname}${nextSearch.length === 0 ? "" : `?${nextSearch}`}${hash}`;
  if (`${pathname}${search}${hash}` === nextUrl) return;
  window.history[historyMode === "push" ? "pushState" : "replaceState"](
    window.history.state,
    "",
    nextUrl
  );
}

function normalizeViewUrlState(input: ViewUrlPatch): ViewUrlState {
  const view = parseView(input.view);
  const scope = parseScope(input.scope);
  const isBranchView = view === "branch";
  return {
    view,
    scope,
    ...(isNonEmpty(input.branch) ? { branch: input.branch } : {}),
    ...(isBranchView && isNonEmpty(input.commit)
      ? { commit: input.commit }
      : {}),
    ...(isNonEmpty(input.file) ? { file: input.file } : {}),
  };
}

function areEqual(a: ViewUrlState, b: ViewUrlState): boolean {
  return (
    a.view === b.view &&
    a.scope === b.scope &&
    a.branch === b.branch &&
    a.commit === b.commit &&
    a.file === b.file
  );
}

function readSearchParams(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}

function setOptionalParam(
  params: URLSearchParams,
  key: string,
  value: string | undefined
): void {
  if (isNonEmpty(value)) {
    params.set(key, value);
  } else {
    params.delete(key);
  }
}

function parseView(value: unknown): View {
  return value === "branch" ? "branch" : DEFAULT_VIEW_URL_STATE.view;
}

function parseScope(value: unknown): ChangesScope {
  return value === "staged" || value === "unstaged" || value === "combined"
    ? value
    : DEFAULT_VIEW_URL_STATE.scope;
}

function isNonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}
