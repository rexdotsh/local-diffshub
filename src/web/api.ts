import type {
  AppState,
  BranchesResponse,
  DiffMode,
  DiffStreamRequest,
  UpdatePreferencesRequest,
  ProjectSummary,
  StatusResponse,
  WorktreesResponse,
} from "../shared/api";

export function loadAppState(): Promise<AppState> {
  return getJson("/api/state");
}

export function updatePreferences(
  preferences: UpdatePreferencesRequest
): Promise<AppState> {
  return requestJson("/api/state/preferences", {
    body: JSON.stringify(preferences),
    method: "PATCH",
  });
}

export function openProject(path: string): Promise<ProjectSummary> {
  return postJson("/api/projects/open", { path });
}

export function loadBranches(path: string): Promise<BranchesResponse> {
  return postJson("/api/projects/branches", { path });
}

export function loadWorktrees(path: string): Promise<WorktreesResponse> {
  return postJson("/api/projects/worktrees", { path });
}

export function loadStatus(path: string): Promise<StatusResponse> {
  return postJson("/api/projects/status", { path });
}

export function createDiffRequest(
  path: string,
  mode: DiffMode,
  branch: string | undefined
): DiffStreamRequest {
  if (mode === "branch") {
    return { path, mode, branch: branch ?? "" };
  }
  return { path, mode };
}

export async function streamDiff(
  request: DiffStreamRequest,
  signal?: AbortSignal
): Promise<Response> {
  const init: RequestInit = {
    body: JSON.stringify(request),
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "text/plain", "Content-Type": "application/json" },
    method: "POST",
    mode: "same-origin",
    redirect: "error",
  };
  if (signal != null) {
    init.signal = signal;
  }

  const response = await fetch("/api/diffs/stream", init);

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(message);
  }

  return response;
}

function postJson<T>(url: string, body: unknown): Promise<T> {
  return requestJson(url, {
    body: JSON.stringify(body),
    method: "POST",
  });
}

function getJson<T>(url: string): Promise<T> {
  return requestJson(url, { method: "GET" });
}

async function requestJson<T>(
  url: string,
  init: Pick<RequestInit, "body" | "method">
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    mode: "same-origin",
    redirect: "error",
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message ?? `Request failed with ${response.status}.`;
  } catch {
    return `Request failed with ${response.status}.`;
  }
}
