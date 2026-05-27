const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_OUTPUT_BYTES = 10 * 1024 * 1024;

export type GitCommandResult = {
  exitCode: number;
  stderr: string;
  stdout: string;
};

export type RunGitOptions = {
  cwd: string;
  maxOutputBytes?: number;
  timeoutMs?: number;
};

export class GitCommandError extends Error {
  readonly args: readonly string[];
  readonly exitCode: number | null;
  readonly stderr: string;

  constructor({
    args,
    exitCode,
    message,
    stderr,
  }: {
    args: readonly string[];
    exitCode: number | null;
    message: string;
    stderr: string;
  }) {
    super(message);
    this.name = "GitCommandError";
    this.args = args;
    this.exitCode = exitCode;
    this.stderr = stderr;
  }
}

export async function runGit(
  args: readonly string[],
  options: RunGitOptions
): Promise<GitCommandResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxOutputBytes = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
  const process = Bun.spawn(["git", ...args], {
    cwd: options.cwd,
    env: createGitEnv(),
    stderr: "pipe",
    stdout: "pipe",
  });
  let escalation: ReturnType<typeof setTimeout> | undefined;
  let timeoutTimer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutTimer = setTimeout(() => {
      process.kill("SIGTERM");
      escalation = setTimeout(() => process.kill("SIGKILL"), 250);
      reject(
        new GitCommandError({
          args,
          exitCode: null,
          message: `Git command timed out after ${timeoutMs}ms.`,
          stderr: "",
        })
      );
    }, timeoutMs);
  });

  try {
    const [stdout, stderr, exitCode] = await Promise.race([
      Promise.all([
        readPipe(process.stdout, maxOutputBytes, args),
        readPipe(process.stderr, maxOutputBytes, args),
        process.exited,
      ]),
      timeout,
    ]);

    if (exitCode !== 0) {
      throw new GitCommandError({
        args,
        exitCode,
        message:
          stderr.trim() || `Git command failed with exit code ${exitCode}.`,
        stderr,
      });
    }

    return { exitCode, stderr, stdout };
  } catch (error) {
    process.kill();
    throw error;
  } finally {
    if (timeoutTimer != null) {
      clearTimeout(timeoutTimer);
    }
    if (escalation != null) {
      clearTimeout(escalation);
    }
  }
}

export async function tryGit(
  args: readonly string[],
  options: RunGitOptions
): Promise<GitCommandResult | null> {
  try {
    return await runGit(args, options);
  } catch (error) {
    if (error instanceof GitCommandError && error.exitCode != null) {
      return null;
    }
    throw error;
  }
}

async function readPipe(
  stream: ReadableStream<Uint8Array>,
  maxOutputBytes: number,
  args: readonly string[]
): Promise<string> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;

  try {
    for (;;) {
      const result = await reader.read();
      if (result.done) {
        break;
      }

      byteLength += result.value.byteLength;
      if (byteLength > maxOutputBytes) {
        throw new GitCommandError({
          args,
          exitCode: null,
          message: `Git output exceeded ${maxOutputBytes} bytes.`,
          stderr: "",
        });
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }

  return new TextDecoder().decode(concatChunks(chunks, byteLength));
}

function concatChunks(
  chunks: readonly Uint8Array[],
  byteLength: number
): Uint8Array {
  const output = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

function createGitEnv(): Record<string, string> {
  return {
    GIT_TERMINAL_PROMPT: "0",
    HOME: process.env.HOME ?? "",
    LANG: "C",
    LC_ALL: "C",
    PATH: process.env.PATH ?? "",
    SSH_AUTH_SOCK: process.env.SSH_AUTH_SOCK ?? "",
    XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME ?? "",
  };
}
