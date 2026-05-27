import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { createApiErrorResponse } from "../src/server/http/errors";
import { createProjectRoutes } from "../src/server/routes/projects";
import type { StateStore } from "../src/server/state/store";
import { createGitRepository } from "./git-test-utils";

function createProjectsApp(store: StateStore): Hono {
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
  app.route("/api/projects", createProjectRoutes(store));
  return app;
}

function createMemoryStore(): StateStore & { paths: string[] } {
  const paths: string[] = [];
  return {
    paths,
    getState() {
      return Promise.resolve({
        preferences: { sidebarCollapsed: false },
        recentProjects: [],
      });
    },
    upsertRecentProject(project) {
      paths.push(project.path);
      return Promise.resolve({
        preferences: {
          lastProjectPath: project.path,
          sidebarCollapsed: false,
        },
        recentProjects: [
          {
            ...project,
            lastOpenedAt: new Date().toISOString(),
          },
        ],
      });
    },
  };
}

describe("project routes", () => {
  test("returns bad request for malformed JSON", async () => {
    const app = createProjectsApp(createMemoryStore());

    const response = await app.request("/api/projects/open", {
      body: "not json",
      method: "POST",
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "bad_request" });
  });

  test("opens a repo and records the repo root", async () => {
    const repoPath = await createGitRepository();
    const store = createMemoryStore();
    const app = createProjectsApp(store);

    const response = await app.request("/api/projects/open", {
      body: JSON.stringify({ path: repoPath }),
      method: "POST",
    });

    expect(response.status).toBe(200);
    expect(store.paths).toEqual([repoPath]);
  });
});
