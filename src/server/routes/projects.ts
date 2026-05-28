import { basename } from "node:path";
import { Hono } from "hono";

import {
  commitsRequestSchema,
  openProjectRequestSchema,
  projectPathRequestSchema,
  type ProjectSummary,
} from "../../shared/api";
import { openProject } from "../git/project";
import {
  listBranches,
  listCommits,
  listWorktrees,
  readStatus,
} from "../git/repository";
import { createBadRequest } from "../http/errors";
import { parseJsonBody } from "../http/json";
import type { StateStore } from "../state/store";

export function createProjectRoutes(store: StateStore): Hono {
  const app = new Hono();

  app.post("/open", async (context) => {
    const body = await parseJsonBody(
      context.req.raw,
      openProjectRequestSchema,
      "Invalid project open payload."
    );

    let project: ProjectSummary;
    try {
      project = await openProject(body.path);
    } catch {
      throw createBadRequest("Path must be inside a Git repository.");
    }

    await store.upsertRecentProject({
      path: project.repoRoot,
      name: basename(project.repoRoot),
      isWorktree: project.isWorktree,
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

  app.post("/commits", async (context) => {
    const body = await parseJsonBody(
      context.req.raw,
      commitsRequestSchema,
      "Invalid commits payload."
    );
    return context.json({
      commits: await readGitProject(() => listCommits(body.path, body.branch)),
    });
  });

  return app;
}

async function readProjectPath(request: Request): Promise<string> {
  const body = await parseJsonBody(
    request,
    projectPathRequestSchema,
    "Invalid project path payload."
  );
  return body.path;
}

async function readGitProject<T>(read: () => Promise<T>): Promise<T> {
  try {
    return await read();
  } catch {
    throw createBadRequest("Path must be inside a Git repository.");
  }
}
