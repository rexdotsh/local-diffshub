import type { DiffStreamRequest } from "../../shared/api";
import { GitCommandError, runGit } from "./command";
import { openProject } from "./project";

const DIFF_BASE_ARGS = ["diff", "--no-ext-diff", "--no-textconv"] as const;
const SHOW_BASE_ARGS = [
  "show",
  "--format=",
  "--patch",
  "--first-parent",
  "--no-ext-diff",
  "--no-textconv",
] as const;

export type DiffCommand = {
  args: string[];
  cwd: string;
};

export async function buildDiffCommand(
  request: DiffStreamRequest
): Promise<DiffCommand> {
  const project = await openProject(request.path);

  if (request.mode === "branch") {
    if (request.branch == null) {
      throw new Error("Branch diff mode requires a branch.");
    }
    const defaultCommit = await assertCommitRef(
      project.repoRoot,
      project.defaultBranch.ref
    );
    const branchCommit = await assertCommitRef(
      project.repoRoot,
      request.branch
    );
    return {
      cwd: project.repoRoot,
      args: [...DIFF_BASE_ARGS, `${defaultCommit}...${branchCommit}`, "--"],
    };
  }

  if (request.mode === "staged") {
    return {
      cwd: project.repoRoot,
      args: [...DIFF_BASE_ARGS, "--cached", "--"],
    };
  }

  if (request.mode === "unstaged") {
    return { cwd: project.repoRoot, args: [...DIFF_BASE_ARGS, "--"] };
  }

  if (request.mode === "combined") {
    return { cwd: project.repoRoot, args: [...DIFF_BASE_ARGS, "HEAD", "--"] };
  }

  if (request.mode === "commit") {
    const commit = await assertCommitRef(project.repoRoot, request.commit);
    return { cwd: project.repoRoot, args: [...SHOW_BASE_ARGS, commit, "--"] };
  }

  if (request.mode === "full") {
    const branch = request.branch ?? project.currentBranch;
    if (branch == null) {
      return { cwd: project.repoRoot, args: [...DIFF_BASE_ARGS, "HEAD", "--"] };
    }
    const defaultCommit = await assertCommitRef(
      project.repoRoot,
      project.defaultBranch.ref
    );
    const branchCommit = await assertCommitRef(project.repoRoot, branch);
    const mergeBase = await gitStdout(
      ["merge-base", defaultCommit, branchCommit],
      project.repoRoot
    );
    return {
      cwd: project.repoRoot,
      args: [...DIFF_BASE_ARGS, mergeBase, "--"],
    };
  }

  throw new Error("Unsupported diff mode.");
}

async function assertCommitRef(cwd: string, ref: string): Promise<string> {
  try {
    return (
      await runGit(
        ["rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`],
        {
          cwd,
        }
      )
    ).stdout.trim();
  } catch (error) {
    if (error instanceof GitCommandError) {
      throw new Error(`Unknown Git ref: ${ref}`);
    }
    throw error;
  }
}

async function gitStdout(
  args: readonly string[],
  cwd: string
): Promise<string> {
  return (await runGit(args, { cwd })).stdout.trim();
}
