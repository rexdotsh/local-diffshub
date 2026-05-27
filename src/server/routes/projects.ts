import { basename } from "node:path";
import { Hono } from "hono";

import {
  openProjectRequestSchema,
  projectPathRequestSchema,
  type ProjectSummary,
} from "../../shared/api";
import { openProject } from "../git/project";
import { listBranches, listWorktrees, readStatus } from "../git/repository";
import { createBadRequest } from "../http/errors";
import type { StateStore } from "../state/store";

export function createProjectRoutes(store: StateStore): Hono {
  const app = new Hono();

  app.post("/open", async (context) => {
    const json = await readJson(context.req.raw);
    const body = openProjectRequestSchema.safeParse(json);
    if (!body.success) {
      throw createBadRequest("Invalid project open payload.");
    }

    let project: ProjectSummary;
    try {
      project = await openProject(body.data.path);
    } catch {
      throw createBadRequest("Path must be inside a Git repository.");
    }

    await store.upsertRecentProject({
      path: project.repoRoot,
      name: basename(project.repoRoot),
    });
    return context.json(project);
  });

  app.post("/branches", async (context) => {
    const path = await readProjectPath(context.req.raw);
    return context.json({
      branches: await readGitProject(() => listBranches(path)),
    });
  });

  app.post("/worktrees", async (context) => {
    const path = await readProjectPath(context.req.raw);
    return context.json({
      worktrees: await readGitProject(() => listWorktrees(path)),
    });
  });

  app.post("/status", async (context) => {
    const path = await readProjectPath(context.req.raw);
    return context.json({
      status: await readGitProject(() => readStatus(path)),
    });
  });

  return app;
}

async function readProjectPath(request: Request): Promise<string> {
  const body = projectPathRequestSchema.safeParse(await readJson(request));
  if (!body.success) {
    throw createBadRequest("Invalid project path payload.");
  }
  return body.data.path;
}

async function readGitProject<T>(read: () => Promise<T>): Promise<T> {
  try {
    return await read();
  } catch {
    throw createBadRequest("Path must be inside a Git repository.");
  }
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw createBadRequest("Request body must be valid JSON.");
  }
}
