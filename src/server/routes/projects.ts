import { basename } from "node:path";
import { Hono } from "hono";

import {
  openProjectRequestSchema,
  type ProjectSummary,
} from "../../shared/api";
import { openProject } from "../git/project";
import { createBadRequest } from "../http/errors";
import type { StateStore } from "../state/store";

export function createProjectRoutes(store: StateStore): Hono {
  const app = new Hono();

  app.post("/open", async (context) => {
    let json: unknown;
    try {
      json = await context.req.json();
    } catch {
      throw createBadRequest("Request body must be valid JSON.");
    }

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

  return app;
}
