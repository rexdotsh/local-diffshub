import type {
  BranchSummary,
  StatusEntry,
  StatusSummary,
  WorktreeSummary,
} from "../../shared/api";
import { runGit } from "./command";
import { openProject } from "./project";

const FIELD_SEPARATOR = "\t";

export async function listBranches(path: string): Promise<BranchSummary[]> {
  const project = await openProject(path);
  const output = await gitStdout(
    [
      "for-each-ref",
      "--format=%(refname:short)%09%(refname)%09%(objectname)%09%(upstream:short)%09%(HEAD)",
      "refs/heads",
      "refs/remotes",
    ],
    project.repoRoot
  );

  return output
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map(parseBranchLine)
    .filter((branch) => !branch.ref.endsWith("/HEAD"));
}

export async function listWorktrees(path: string): Promise<WorktreeSummary[]> {
  const project = await openProject(path);
  const output = await gitStdout(
    ["worktree", "list", "--porcelain", "-z"],
    project.repoRoot
  );
  return parseWorktreeList(output);
}

export async function readStatus(path: string): Promise<StatusSummary> {
  const project = await openProject(path);
  const output = await gitStdout(
    ["status", "--porcelain=v1", "--branch", "-z"],
    project.repoRoot
  );
  return parseStatus(output);
}

function parseBranchLine(line: string): BranchSummary {
  const [name, ref, commit, upstream, head] = line.split(FIELD_SEPARATOR);
  if (name == null || ref == null || commit == null) {
    throw new Error("Unable to parse git branch output.");
  }

  return {
    commit,
    current: head === "*",
    name,
    ref,
    type: ref.startsWith("refs/remotes/") ? "remote" : "local",
    upstream: upstream == null || upstream === "" ? null : upstream,
  };
}

function parseWorktreeList(output: string): WorktreeSummary[] {
  const worktrees: WorktreeSummary[] = [];
  let current: Partial<WorktreeSummary> = {};

  for (const token of output.split("\0")) {
    if (token === "") {
      if (current.path != null) {
        worktrees.push({
          branch: current.branch ?? null,
          commit: current.commit ?? null,
          detached: current.detached ?? current.branch == null,
          path: current.path,
        });
      }
      current = {};
      continue;
    }

    const [key, ...valueParts] = token.split(" ");
    const value = valueParts.join(" ");
    if (key === "worktree") {
      current.path = value;
    } else if (key === "HEAD") {
      current.commit = value;
    } else if (key === "branch") {
      current.branch = value.replace(/^refs\/heads\//, "");
    } else if (key === "detached") {
      current.detached = true;
    }
  }

  return worktrees;
}

function parseStatus(output: string): StatusSummary {
  const tokens = output.split("\0").filter((token) => token !== "");
  const branchLine =
    tokens[0]?.startsWith("## ") === true ? (tokens.shift() ?? null) : null;
  const entries = parseStatusEntries(tokens);
  const branch = parseStatusBranch(branchLine);

  return {
    ahead: branch.ahead,
    behind: branch.behind,
    branch: branch.name,
    conflicted: entries.filter((entry) => isConflict(entry)).length,
    entries,
    staged: entries.filter(
      (entry) => entry.staged !== " " && entry.staged !== "?"
    ).length,
    unstaged: entries.filter(
      (entry) => entry.unstaged !== " " && entry.unstaged !== "?"
    ).length,
    untracked: entries.filter(
      (entry) => entry.staged === "?" && entry.unstaged === "?"
    ).length,
  };
}

function parseStatusEntries(tokens: readonly string[]): StatusEntry[] {
  const entries: StatusEntry[] = [];

  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (token == null) {
      continue;
    }

    const entry = parseStatusEntry(token);
    if (entry.staged === "R" || entry.staged === "C") {
      entry.originalPath = tokens[index + 1] ?? null;
      index++;
    }
    entries.push(entry);
  }

  return entries;
}

function parseStatusEntry(token: string): StatusEntry {
  return {
    originalPath: null,
    staged: token[0] ?? " ",
    unstaged: token[1] ?? " ",
    path: token.slice(3),
  };
}

function parseStatusBranch(line: string | null): {
  ahead: number;
  behind: number;
  name: string | null;
} {
  if (line == null) {
    return { ahead: 0, behind: 0, name: null };
  }

  const content = line.slice(3);
  if (content.startsWith("No commits yet on ")) {
    return {
      ahead: 0,
      behind: 0,
      name: content.slice("No commits yet on ".length),
    };
  }

  const bracketIndex = content.indexOf(" [");
  const branchSegment =
    bracketIndex === -1 ? content : content.slice(0, bracketIndex);
  const flags = bracketIndex === -1 ? "" : content.slice(bracketIndex + 2, -1);
  const [branchName] = branchSegment.split("...");

  return {
    ahead: parseFlagCount(flags, "ahead"),
    behind: parseFlagCount(flags, "behind"),
    name:
      branchName == null || branchName === "HEAD (no branch)"
        ? null
        : branchName,
  };
}

function parseFlagCount(flags: string, key: "ahead" | "behind"): number {
  const match = new RegExp(`${key} (\\d+)`).exec(flags);
  return match?.[1] == null ? 0 : Number(match[1]);
}

function isConflict(entry: StatusEntry): boolean {
  return (
    entry.staged === "U" ||
    entry.unstaged === "U" ||
    (entry.staged === "A" && entry.unstaged === "A") ||
    (entry.staged === "D" && entry.unstaged === "D")
  );
}

async function gitStdout(
  args: readonly string[],
  cwd: string
): Promise<string> {
  return (await runGit(args, { cwd })).stdout.trimEnd();
}
