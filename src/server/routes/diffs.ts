import { Hono } from "hono";

import { diffStreamRequestSchema } from "../../shared/api";
import { createGitEnv } from "../git/command";
import { buildDiffCommand, type DiffCommand } from "../git/diff";
import { createBadRequest } from "../http/errors";

const DIFF_TIMEOUT_MS = 60_000;
const MAX_DIFF_BYTES = 50 * 1024 * 1024;

export function createDiffRoutes(): Hono {
  const app = new Hono();

  app.post("/stream", async (context) => {
    const body = diffStreamRequestSchema.safeParse(
      await readJson(context.req.raw)
    );
    if (!body.success) {
      throw createBadRequest("Invalid diff stream payload.");
    }

    let command: DiffCommand;
    try {
      command = await buildDiffCommand(body.data);
    } catch {
      throw createBadRequest(
        "Unable to create diff for the requested project."
      );
    }

    const subprocess = Bun.spawn(["git", ...command.args], {
      cwd: command.cwd,
      env: createGitEnv(),
      stderr: "pipe",
      stdout: "pipe",
    });
    const stderr = readLimitedText(subprocess.stderr, 64 * 1024);

    return new Response(
      limitDiffStream(subprocess.stdout, subprocess, stderr),
      {
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": "text/plain; charset=utf-8",
        },
      }
    );
  });

  return app;
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw createBadRequest("Request body must be valid JSON.");
  }
}

function limitDiffStream(
  source: ReadableStream<Uint8Array>,
  subprocess: Bun.Subprocess<"ignore", "pipe", "pipe">,
  stderr: Promise<string>
): ReadableStream<Uint8Array> {
  const reader = source.getReader();
  let byteLength = 0;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let escalation: ReturnType<typeof setTimeout> | undefined;

  function cleanup(): void {
    if (timeout != null) {
      clearTimeout(timeout);
    }
    if (escalation != null) {
      clearTimeout(escalation);
    }
  }

  function kill(): void {
    subprocess.kill("SIGTERM");
    escalation = setTimeout(() => subprocess.kill("SIGKILL"), 250);
  }

  return new ReadableStream<Uint8Array>({
    start(controller) {
      async function pump(): Promise<void> {
        timeout = setTimeout(() => {
          kill();
          controller.error(new Error("Diff command timed out."));
        }, DIFF_TIMEOUT_MS);

        try {
          for (;;) {
            const result = await reader.read();
            if (result.done) {
              break;
            }

            byteLength += result.value.byteLength;
            if (byteLength > MAX_DIFF_BYTES) {
              kill();
              controller.error(
                new Error("Diff output exceeded the size limit.")
              );
              return;
            }
            controller.enqueue(result.value);
          }

          const [exitCode, stderrText] = await Promise.all([
            subprocess.exited,
            stderr,
          ]);
          if (exitCode !== 0) {
            controller.error(
              new Error(
                stderrText.trim() ||
                  `Git diff failed with exit code ${exitCode}.`
              )
            );
            return;
          }

          controller.close();
        } catch (error) {
          kill();
          controller.error(error);
        } finally {
          cleanup();
          reader.releaseLock();
        }
      }

      pump().catch((error: unknown) => controller.error(error));
    },
    cancel() {
      cleanup();
      kill();
      return reader.cancel();
    },
  });
}

async function readLimitedText(
  stream: ReadableStream<Uint8Array>,
  maxBytes: number
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

      if (byteLength + result.value.byteLength > maxBytes) {
        break;
      }
      byteLength += result.value.byteLength;
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
