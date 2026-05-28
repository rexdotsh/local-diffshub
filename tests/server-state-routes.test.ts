import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { createApiErrorResponse } from "../src/server/http/errors";
import { createStateRoutes } from "../src/server/routes/state";
import type { StateStore } from "../src/server/state/store";
import { createMemoryStateStore } from "./state-test-utils";

function createStateApp(store: StateStore): Hono {
  const app = new Hono();
  app.onError((error, context) => {
    if (error instanceof HTTPException) {
      return context.json(
        createApiErrorResponse(
          error.status === 400 ? "bad_request" : "request_error",
          error.message
        ),
        error.status
      );
    }

    throw error;
  });
  app.route("/api/state", createStateRoutes(store));
  return app;
}

describe("state routes", () => {
  test("returns persisted state", async () => {
    const app = createStateApp(createMemoryStateStore());

    const response = await app.request("/api/state");

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      preferences: { diffStyle: "split" },
      recentProjects: [],
    });
  });

  test("updates preferences", async () => {
    const app = createStateApp(createMemoryStateStore());

    const response = await app.request("/api/state/preferences", {
      body: JSON.stringify({ diffStyle: "unified", overflow: "wrap" }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      preferences: { diffStyle: "unified", overflow: "wrap" },
    });
  });

  test("preserves omitted preferences", async () => {
    const app = createStateApp(createMemoryStateStore());

    await app.request("/api/state/preferences", {
      body: JSON.stringify({ diffStyle: "unified", overflow: "wrap" }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    });
    const response = await app.request("/api/state/preferences", {
      body: JSON.stringify({ collapseMode: "collapsed" }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      preferences: {
        diffStyle: "unified",
        overflow: "wrap",
        collapseMode: "collapsed",
      },
    });
  });

  test("rejects non-json preference updates", async () => {
    const app = createStateApp(createMemoryStateStore());

    const response = await app.request("/api/state/preferences", {
      body: "{}",
      method: "PATCH",
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "bad_request" });
  });
});
