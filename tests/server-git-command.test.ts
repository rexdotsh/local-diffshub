import { describe, expect, test } from "bun:test";

import { GitCommandError, runGit } from "../src/server/git/command";
import { createGitRepository } from "./git-test-utils";

describe("runGit", () => {
  test("runs git with argv and captures stdout", async () => {
    const repoPath = await createGitRepository();

    const result = await runGit(["branch", "--show-current"], {
      cwd: repoPath,
    });

    expect(result.stdout.trim()).toBe("main");
  });

  test("throws GitCommandError on failed git command", async () => {
    const repoPath = await createGitRepository();

    await expect(
      runGit(["rev-parse", "--verify", "missing-branch"], { cwd: repoPath })
    ).rejects.toBeInstanceOf(GitCommandError);
  });
});
