import { readdir, stat } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";

import type { DirectoryEntry, DirectoryListing } from "../../shared/api";

export async function listDirectory(
  inputPath: string
): Promise<DirectoryListing> {
  const absolutePath = await resolveListingPath(inputPath);
  const parentPath = dirname(absolutePath);

  const dirents = await readdir(absolutePath, { withFileTypes: true });
  const directories = dirents.filter(
    (entry) => entry.isDirectory() && !entry.name.startsWith(".")
  );

  const entries = await Promise.all(
    directories.map(async (entry): Promise<DirectoryEntry> => {
      const entryPath = resolve(absolutePath, entry.name);
      return {
        kind: (await hasGitMetadata(entryPath)) ? "git-repo" : "directory",
        name: entry.name,
        path: entryPath,
      };
    })
  );

  entries.sort(compareEntries);

  return {
    entries,
    parent: parentPath === absolutePath ? null : parentPath,
    path: absolutePath,
  };
}

function resolveListingPath(inputPath: string): Promise<string> {
  const trimmed = inputPath.trim();
  const base = trimmed === "" ? homeDirectory() : trimmed;
  const expanded = base.startsWith("~")
    ? base.replace(/^~(?=$|\/)/, homeDirectory())
    : base;
  const candidate = isAbsolute(expanded)
    ? expanded
    : resolve(homeDirectory(), expanded);
  return ensureDirectory(candidate);
}

async function ensureDirectory(path: string): Promise<string> {
  const info = await stat(path);
  if (!info.isDirectory()) {
    throw new Error(`Path is not a directory: ${path}`);
  }
  return path;
}

async function hasGitMetadata(path: string): Promise<boolean> {
  try {
    await stat(`${path}/.git`);
    return true;
  } catch {
    return false;
  }
}

function compareEntries(a: DirectoryEntry, b: DirectoryEntry): number {
  if (a.kind !== b.kind) {
    return a.kind === "git-repo" ? -1 : 1;
  }
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

function homeDirectory(): string {
  return process.env.HOME ?? process.cwd();
}
