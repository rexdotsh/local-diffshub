import { realpath, stat } from "node:fs/promises";
import { dirname } from "node:path";

import type { DefaultBranch, ProjectSummary } from "../../shared/api";
import { runGit, tryGit } from "./command";

export async function openProject(inputPath: string): Promise<ProjectSummary> {
  const cwd = await resolveWorkingDirectory(inputPath);
  const [repoRoot, gitDir, commonDir, currentBranch] = await Promise.all([
    gitOutput(["rev-parse", "--show-toplevel"], cwd),
    gitOutput(["rev-parse", "--path-format=absolute", "--git-dir"], cwd),
    gitOutput(["rev-parse", "--path-format=absolute", "--git-common-dir"], cwd),
    readCurrentBranch(cwd),
  ]);
  const defaultBranch = await detectDefaultBranch(cwd, currentBranch);

  return {
    path: cwd,
    repoRoot,
    gitDir,
    commonDir,
    currentBranch,
    defaultBranch,
    isWorktree: gitDir !== commonDir,
  };
}

async function resolveWorkingDirectory(inputPath: string): Promise<string> {
  const resolvedPath = await realpath(inputPath);
  const pathStat = await stat(resolvedPath);
  return pathStat.isDirectory() ? resolvedPath : dirname(resolvedPath);
}

async function readCurrentBranch(cwd: string): Promise<string | null> {
  const result = await tryGit(["branch", "--show-current"], { cwd });
  const branch = result?.stdout.trim() ?? "";
  return branch === "" ? null : branch;
}

async function detectDefaultBranch(
  cwd: string,
  currentBranch: string | null
): Promise<DefaultBranch> {
  const originHead = await tryGit(
    ["symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD"],
    { cwd }
  );
  const originHeadRef = originHead?.stdout.trim();
  if (originHeadRef != null && originHeadRef !== "") {
    return {
      name: originHeadRef.replace(/^origin\//, ""),
      ref: originHeadRef,
      source: "origin_head",
    };
  }

  if (await hasLocalBranch(cwd, "main")) {
    return { name: "main", ref: "main", source: "local_main" };
  }

  if (await hasLocalBranch(cwd, "master")) {
    return { name: "master", ref: "master", source: "local_master" };
  }

  if (currentBranch != null) {
    return { name: currentBranch, ref: currentBranch, source: "current" };
  }

  throw new Error("Unable to detect a default branch for this repository.");
}

async function hasLocalBranch(cwd: string, branch: string): Promise<boolean> {
  return (
    (await tryGit(["show-ref", "--verify", `refs/heads/${branch}`], { cwd })) !=
    null
  );
}

async function gitOutput(
  args: readonly string[],
  cwd: string
): Promise<string> {
  return (await runGit(args, { cwd })).stdout.trim();
}
