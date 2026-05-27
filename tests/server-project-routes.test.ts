import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { createApiErrorResponse } from "../src/server/http/errors";
import { createProjectRoutes } from "../src/server/routes/projects";
import type { StateStore } from "../src/server/state/store";
import { createGitRepository } from "./git-test-utils";
import { createMemoryStateStore } from "./state-test-utils";

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

describe("project routes", () => {
  test("returns bad request for malformed JSON", async () => {
    const app = createProjectsApp(createMemoryStateStore());

    const response = await app.request("/api/projects/open", {
      body: "not json",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "bad_request" });
  });

  test("opens a repo and records the repo root", async () => {
    const repoPath = await createGitRepository();
    const store = createMemoryStateStore();
    const app = createProjectsApp(store);

    const response = await app.request("/api/projects/open", {
      body: JSON.stringify({ path: repoPath }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(200);
    expect(store.paths).toEqual([repoPath]);
  });

  test("returns branches, commits, worktrees, and status", async () => {
    const repoPath = await createGitRepository();
    const app = createProjectsApp(createMemoryStateStore());
    const body = JSON.stringify({ path: repoPath });

    const branches = await app.request("/api/projects/branches", {
      body,
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const worktrees = await app.request("/api/projects/worktrees", {
      body,
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const commits = await app.request("/api/projects/commits", {
      body,
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const status = await app.request("/api/projects/status", {
      body,
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(branches.status).toBe(200);
    expect(commits.status).toBe(200);
    expect(worktrees.status).toBe(200);
    expect(status.status).toBe(200);
    expect(await branches.json()).toMatchObject({
      branches: [{ name: "main", type: "local" }],
    });
    expect(await worktrees.json()).toMatchObject({
      worktrees: [{ branch: "main", path: repoPath }],
    });
    expect(await commits.json()).toMatchObject({
      commits: [{ subject: "initial" }],
    });
    expect(await status.json()).toMatchObject({ status: { branch: "main" } });
  });

  test("returns bad request for read endpoints outside git repos", async () => {
    const app = createProjectsApp(createMemoryStateStore());

    const response = await app.request("/api/projects/status", {
      body: JSON.stringify({ path: "/definitely/missing/local-diffhub" }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "bad_request" });
  });
});
