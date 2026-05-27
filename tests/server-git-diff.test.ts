import { describe, expect, test } from "bun:test";

import { buildDiffCommand } from "../src/server/git/diff";
import { createGitRepository, runGitSetup } from "./git-test-utils";

describe("buildDiffCommand", () => {
  test("builds branch diff against detected default branch", async () => {
    const repoPath = await createGitRepository();
    await runGitSetup(repoPath, ["branch", "feature/demo"]);

    const command = await buildDiffCommand({
      path: repoPath,
      mode: "branch",
      branch: "feature/demo",
    });

    expect(command.cwd).toBe(repoPath);
    expect(command.args).toContain("main...feature/demo");
    expect(command.args).toContain("--no-ext-diff");
    expect(command.args).toContain("--no-textconv");
  });

  test("builds staged, unstaged, and combined worktree diffs", async () => {
    const repoPath = await createGitRepository();

    await expect(
      buildDiffCommand({ path: repoPath, mode: "staged" })
    ).resolves.toMatchObject({
      args: ["diff", "--no-ext-diff", "--no-textconv", "--cached", "--"],
    });
    await expect(
      buildDiffCommand({ path: repoPath, mode: "unstaged" })
    ).resolves.toMatchObject({
      args: ["diff", "--no-ext-diff", "--no-textconv", "--"],
    });
    await expect(
      buildDiffCommand({ path: repoPath, mode: "combined" })
    ).resolves.toMatchObject({
      args: ["diff", "--no-ext-diff", "--no-textconv", "HEAD", "--"],
    });
  });

  test("builds full review diff from merge base", async () => {
    const repoPath = await createGitRepository();

    await expect(
      buildDiffCommand({ path: repoPath, mode: "full", branch: "main" })
    ).resolves.toMatchObject({
      args: [
        "diff",
        "--no-ext-diff",
        "--no-textconv",
        expect.any(String),
        "--",
      ],
    });
  });
});
