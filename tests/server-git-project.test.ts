import { join } from "node:path";
import { describe, expect, test } from "bun:test";

import { openProject } from "../src/server/git/project";
import { createGitRepository, runGitSetup } from "./git-test-utils";

describe("openProject", () => {
  test("opens a git repository and detects main as default branch", async () => {
    const repoPath = await createGitRepository();

    const project = await openProject(repoPath);

    expect(project.repoRoot).toBe(repoPath);
    expect(project.currentBranch).toBe("main");
    expect(project.defaultBranch).toEqual({
      name: "main",
      ref: "main",
      source: "local_main",
    });
    expect(project.isWorktree).toBe(false);
  });

  test("accepts a file path inside the repository", async () => {
    const repoPath = await createGitRepository();

    const project = await openProject(join(repoPath, "README.md"));

    expect(project.repoRoot).toBe(repoPath);
  });

  test("prefers origin HEAD when present", async () => {
    const repoPath = await createGitRepository();
    await runGitSetup(repoPath, ["branch", "trunk"]);
    await runGitSetup(repoPath, [
      "update-ref",
      "refs/remotes/origin/trunk",
      "trunk",
    ]);
    await runGitSetup(repoPath, [
      "symbolic-ref",
      "refs/remotes/origin/HEAD",
      "refs/remotes/origin/trunk",
    ]);

    const project = await openProject(repoPath);

    expect(project.defaultBranch).toEqual({
      name: "trunk",
      ref: "origin/trunk",
      source: "origin_head",
    });
  });
});
