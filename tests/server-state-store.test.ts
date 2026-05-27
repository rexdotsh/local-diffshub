import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "bun:test";

import { createStateStore } from "../src/server/state/store";

async function createTemporaryStatePath(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "local-diffhub-"));
  return join(directory, "nested", "state.json");
}

describe("createStateStore", () => {
  test("returns default state when the state file is missing", async () => {
    const store = createStateStore(await createTemporaryStatePath());

    await expect(store.getState()).resolves.toEqual({
      preferences: { sidebarCollapsed: false },
      recentProjects: [],
    });
  });

  test("upserts recent projects and persists private JSON", async () => {
    const statePath = await createTemporaryStatePath();
    const store = createStateStore(statePath);

    await store.upsertRecentProject({ path: "/tmp/one", name: "one" });
    const state = await store.upsertRecentProject({
      path: "/tmp/one",
      name: "one-renamed",
    });

    expect(state.preferences.lastProjectPath).toBe("/tmp/one");
    expect(state.recentProjects).toHaveLength(1);
    expect(state.recentProjects[0]?.name).toBe("one-renamed");
    expect(await readFile(statePath, "utf8")).toContain("one-renamed");
  });

  test("serializes concurrent recent project writes", async () => {
    const store = createStateStore(await createTemporaryStatePath());

    const writes = Array.from({ length: 25 }, (_, index) =>
      store.upsertRecentProject({
        path: `/tmp/project-${index}`,
        name: `project-${index}`,
      })
    );
    const states = await Promise.all(writes);
    const finalState = states.at(-1);

    expect(finalState?.recentProjects).toHaveLength(20);
    expect(finalState?.recentProjects[0]?.path).toBe("/tmp/project-24");
  });
});
