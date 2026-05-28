import { Hono } from "hono";

import { listDirectoryRequestSchema } from "../../shared/api";
import { listDirectory } from "../fs/browse";
import { createBadRequest } from "../http/errors";
import { parseJsonBody } from "../http/json";

export function createFsRoutes(): Hono {
  const app = new Hono();

  app.post("/list", async (context) => {
    const body = await parseJsonBody(
      context.req.raw,
      listDirectoryRequestSchema,
      "Invalid directory listing payload."
    );
    try {
      return context.json(await listDirectory(body.path));
    } catch {
      throw createBadRequest("Unable to read directory.");
    }
  });

  return app;
}
