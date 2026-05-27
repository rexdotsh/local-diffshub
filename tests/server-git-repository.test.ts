import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

import {
  listBranches,
  listCommits,
  listWorktrees,
  readStatus,
} from "../src/server/git/repository";
import { createGitRepository, runGitSetup } from "./git-test-utils";

describe("repository git readers", () => {
  test("lists local and remote branches", async () => {
    const repoPath = await createGitRepository();
    await runGitSetup(repoPath, ["branch", "feature/demo"]);
    await runGitSetup(repoPath, [
      "update-ref",
      "refs/remotes/origin/feature/demo",
      "feature/demo",
    ]);

    const branches = await listBranches(repoPath);

    expect(branches.some((branch) => branch.name === "main")).toBe(true);
    expect(branches.some((branch) => branch.name === "feature/demo")).toBe(
      true
    );
    expect(
      branches.some((branch) => branch.name === "origin/feature/demo")
    ).toBe(true);
  });

  test("lists git worktrees", async () => {
    const repoPath = await createGitRepository();

    const worktrees = await listWorktrees(repoPath);

    expect(worktrees).toHaveLength(1);
    expect(worktrees[0]).toMatchObject({ branch: "main", path: repoPath });
  });

  test("lists recent commits", async () => {
    const repoPath = await createGitRepository();

    const commits = await listCommits(repoPath);

    expect(commits).toHaveLength(1);
    expect(commits[0]).toMatchObject({
      author: "Local Diffhub Test",
      shortHash: expect.any(String),
      subject: "initial",
    });
    expect(commits[0]?.hash).toHaveLength(40);
  });

  test("summarizes working tree status", async () => {
    const repoPath = await createGitRepository();
    await writeFile(join(repoPath, "new.txt"), "new\n");
    await writeFile(join(repoPath, "README.md"), "changed\n");
    await runGitSetup(repoPath, ["add", "README.md"]);

    const status = await readStatus(repoPath);

    expect(status.branch).toBe("main");
    expect(status.staged).toBe(1);
    expect(status.unstaged).toBe(0);
    expect(status.untracked).toBe(1);
    expect(status.entries.map((entry) => entry.path).sort()).toEqual([
      "README.md",
      "new.txt",
    ]);
  });

  test("parses rename status as one entry", async () => {
    const repoPath = await createGitRepository();
    await runGitSetup(repoPath, ["mv", "README.md", "RENAMED.md"]);

    const status = await readStatus(repoPath);

    expect(status.entries).toHaveLength(1);
    expect(status.entries[0]).toMatchObject({
      originalPath: "README.md",
      path: "RENAMED.md",
      staged: "R",
    });
  });
});
