import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

export async function createGitRepository(): Promise<string> {
  const repoPath = join(
    tmpdir(),
    `local-diffhub-git-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
  await mkdir(repoPath, { recursive: true });
  await runGitSetup(repoPath, ["init", "-b", "main"]);
  await runGitSetup(repoPath, ["config", "user.email", "test@example.com"]);
  await runGitSetup(repoPath, ["config", "user.name", "Local Diffhub Test"]);
  await writeFile(join(repoPath, "README.md"), "# test\n");
  await runGitSetup(repoPath, ["add", "README.md"]);
  await runGitSetup(repoPath, ["commit", "-m", "initial"]);
  return repoPath;
}

export async function runGitSetup(
  cwd: string,
  args: readonly string[]
): Promise<string> {
  const process = Bun.spawn(["git", ...args], {
    cwd,
    stderr: "pipe",
    stdout: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);
  if (exitCode !== 0) {
    throw new Error(stderr || `git ${args.join(" ")} failed`);
  }
  return stdout;
}
