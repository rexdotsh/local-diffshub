import { join } from "node:path";
import chokidar, { type FSWatcher } from "chokidar";
import { Hono } from "hono";

import type { ProjectChangeEvent } from "../../shared/api";
import { openProject } from "../git/project";
import { isTrustedOrigin } from "../http/cors";
import { createApiErrorResponse, createBadRequest } from "../http/errors";

const EVENT_DEBOUNCE_MS = 250;
const HEARTBEAT_MS = 30_000;

export function createEventRoutes(): Hono {
  const app = new Hono();

  app.get("/project", async (context) => {
    if (isCrossSiteEventRequest(context.req.raw)) {
      return context.json(
        createApiErrorResponse(
          "forbidden",
          "Cross-site requests are not allowed."
        ),
        403
      );
    }

    const path = context.req.query("path");
    if (path == null || path === "") {
      throw createBadRequest("Project path is required.");
    }

    let project: Awaited<ReturnType<typeof openProject>>;
    try {
      project = await openProject(path);
    } catch {
      throw createBadRequest("Path must be inside a Git repository.");
    }

    return new Response(createProjectEventStream(project), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/event-stream; charset=utf-8",
        "X-Accel-Buffering": "no",
      },
    });
  });

  return app;
}

function createProjectEventStream(
  project: Awaited<ReturnType<typeof openProject>>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const repoRoot = project.repoRoot;
  const watchers: FSWatcher[] = [];
  let debounce: ReturnType<typeof setTimeout> | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let closed = false;

  async function cleanup(): Promise<void> {
    closed = true;
    if (debounce != null) {
      clearTimeout(debounce);
      debounce = undefined;
    }
    if (heartbeat != null) {
      clearInterval(heartbeat);
      heartbeat = undefined;
    }
    await Promise.all(watchers.map((watcher) => watcher.close()));
  }

  return new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: unknown): void => {
        if (closed) {
          return;
        }
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      send("ready", { repoRoot });
      heartbeat = setInterval(
        () => send("heartbeat", { repoRoot }),
        HEARTBEAT_MS
      );

      const watcher = chokidar.watch(repoRoot, {
        awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
        ignored: /(^|[/\\])(\.git|node_modules|dist)([/\\]|$)/,
        ignoreInitial: true,
        persistent: true,
      });
      const gitWatcher = chokidar.watch(getGitMetadataWatchPaths(project), {
        awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
        ignoreInitial: true,
        persistent: true,
      });
      watchers.push(watcher, gitWatcher);

      const onChange = (_eventName: string, changedPath: string) => {
        if (closed) {
          return;
        }
        if (debounce != null) {
          clearTimeout(debounce);
        }
        debounce = setTimeout(() => {
          debounce = undefined;
          const event: ProjectChangeEvent = {
            changedPath,
            repoRoot,
            timestamp: new Date().toISOString(),
          };
          send("project-change", event);
        }, EVENT_DEBOUNCE_MS);
      };

      watcher.on("all", onChange);
      gitWatcher.on("all", onChange);

      const onError = (error: unknown) => {
        cleanup().finally(() => controller.error(error));
      };
      watcher.on("error", onError);
      gitWatcher.on("error", onError);
    },
    async cancel() {
      await cleanup();
    },
  });
}

function getGitMetadataWatchPaths(
  project: Awaited<ReturnType<typeof openProject>>
): string[] {
  return [
    join(project.gitDir, "HEAD"),
    join(project.gitDir, "index"),
    join(project.commonDir, "refs"),
    join(project.commonDir, "packed-refs"),
    join(project.commonDir, "logs"),
  ];
}

function isCrossSiteEventRequest(request: Request): boolean {
  if (isTrustedOrigin(request)) {
    return false;
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (
    fetchSite != null &&
    fetchSite !== "same-origin" &&
    fetchSite !== "same-site" &&
    fetchSite !== "none"
  ) {
    return true;
  }

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin == null || host == null) {
    return false;
  }

  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}
