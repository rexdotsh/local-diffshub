import { Hono } from "hono";

import { upsertRecentProjectRequestSchema } from "../../shared/api";
import { createBadRequest } from "../http/errors";
import type { StateStore } from "../state/store";

export function createStateRoutes(store: StateStore): Hono {
  const app = new Hono();

  app.get("/", async (context) => {
    return context.json(await store.getState());
  });

  app.post("/recent-projects", async (context) => {
    let json: unknown;
    try {
      json = await context.req.json();
    } catch {
      throw createBadRequest("Request body must be valid JSON.");
    }

    const body = upsertRecentProjectRequestSchema.safeParse(json);
    if (!body.success) {
      throw createBadRequest("Invalid recent project payload.");
    }

    const projectPath = body.data.path;
    return context.json(
      await store.upsertRecentProject({
        path: projectPath,
        name:
          body.data.name ?? projectPath.split(/[\\/]/).at(-1) ?? projectPath,
      })
    );
  });

  return app;
}
