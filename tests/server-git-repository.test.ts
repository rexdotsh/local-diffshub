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

    expect(branches[0]?.name).toBe("main");
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

    const commits = await listCommits(repoPath, "main");

    expect(commits).toHaveLength(1);
    expect(commits[0]).toMatchObject({
      author: "Local Diffhub Test",
      shortHash: expect.any(String),
      subject: "initial",
    });
    expect(commits[0]?.hash).toHaveLength(40);
  });

  test("lists commits for a selected branch", async () => {
    const repoPath = await createGitRepository();
    await runGitSetup(repoPath, ["checkout", "-b", "feature/demo"]);
    await writeFile(join(repoPath, "feature.txt"), "feature\n");
    await runGitSetup(repoPath, ["add", "feature.txt"]);
    await runGitSetup(repoPath, ["commit", "-m", "feature work"]);
    await runGitSetup(repoPath, ["checkout", "main"]);
    await writeFile(join(repoPath, "main.txt"), "main\n");
    await runGitSetup(repoPath, ["add", "main.txt"]);
    await runGitSetup(repoPath, ["commit", "-m", "main work"]);

    const commits = await listCommits(repoPath, "feature/demo");

    expect(commits.map((commit) => commit.subject)).toContain("feature work");
    expect(commits.map((commit) => commit.subject)).not.toContain("main work");
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
