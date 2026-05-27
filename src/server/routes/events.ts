import chokidar, { type FSWatcher } from "chokidar";
import { Hono } from "hono";

import type { ProjectChangeEvent } from "../../shared/api";
import { openProject } from "../git/project";
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

    let repoRoot: string;
    try {
      repoRoot = (await openProject(path)).repoRoot;
    } catch {
      throw createBadRequest("Path must be inside a Git repository.");
    }

    return new Response(createProjectEventStream(repoRoot), {
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
  repoRoot: string
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let watcher: FSWatcher | undefined;
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
    await watcher?.close();
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

      watcher = chokidar.watch(repoRoot, {
        awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
        ignored: /(^|[/\\])(\.git|node_modules|dist)([/\\]|$)/,
        ignoreInitial: true,
        persistent: true,
      });

      watcher.on("all", (_eventName, changedPath) => {
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
      });

      watcher.on("error", (error) => {
        cleanup().finally(() => controller.error(error));
      });
    },
    async cancel() {
      await cleanup();
    },
  });
}

function isCrossSiteEventRequest(request: Request): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (
    fetchSite != null &&
    fetchSite !== "same-origin" &&
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
