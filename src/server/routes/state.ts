import { Hono } from "hono";

import {
  updatePreferencesRequestSchema,
  upsertRecentProjectRequestSchema,
} from "../../shared/api";
import { parseJsonBody } from "../http/json";
import type { StateStore } from "../state/store";

export function createStateRoutes(store: StateStore): Hono {
  const app = new Hono();

  app.get("/", async (context) => {
    return context.json(await store.getState());
  });

  app.post("/recent-projects", async (context) => {
    const body = await parseJsonBody(
      context.req.raw,
      upsertRecentProjectRequestSchema,
      "Invalid recent project payload."
    );

    const projectPath = body.path;
    return context.json(
      await store.upsertRecentProject({
        path: projectPath,
        name: body.name ?? projectPath.split(/[\\/]/).at(-1) ?? projectPath,
      })
    );
  });

  app.patch("/preferences", async (context) => {
    const body = await parseJsonBody(
      context.req.raw,
      updatePreferencesRequestSchema,
      "Invalid preferences payload."
    );
    return context.json(await store.updatePreferences(body));
  });

  return app;
}
