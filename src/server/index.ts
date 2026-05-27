import { readFile } from "node:fs/promises";
import { serveStatic } from "hono/bun";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { fileURLToPath } from "node:url";

import type { HealthResponse } from "@/shared/api";

const DEFAULT_PORT = 3003;
const packageRootUrl = new URL("../../", import.meta.url);
const clientDistPath = fileURLToPath(new URL("dist/client/", packageRootUrl));

function resolvePort(value: string | undefined): number {
  if (value == null || value === "") {
    return DEFAULT_PORT;
  }

  const port = Number(value);
  return Number.isInteger(port) && port > 0 && port <= 65_535
    ? port
    : DEFAULT_PORT;
}

const app = new Hono();

app.use("*", async (context, next) => {
  context.header("X-Content-Type-Options", "nosniff");
  context.header("Referrer-Policy", "same-origin");
  context.header(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  context.header(
    "Content-Security-Policy",
    "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'"
  );
  await next();
});

app.onError((error, context) => {
  if (error instanceof HTTPException) {
    return context.json(
      {
        error: "request_error",
        message: error.message,
      },
      error.status
    );
  }

  console.error(error);
  return context.json(
    {
      error: "internal_error",
      message: "Internal server error",
    },
    500
  );
});

app.get("/api/health", (context) => {
  const health: HealthResponse = {
    ok: true,
    service: "local-diffhub",
  };
  return context.json(health);
});

app.use("/*", serveStatic({ root: clientDistPath }));

app.notFound(async (context) => {
  if (new URL(context.req.url).pathname.startsWith("/api/")) {
    return context.json(
      {
        error: "not_found",
        message: "API route not found",
      },
      404
    );
  }

  let indexFile: Uint8Array;
  try {
    indexFile = await readFile(`${clientDistPath}/index.html`);
  } catch {
    return context.text("Client build not found", 404);
  }

  return new Response(indexFile, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
});

export default {
  hostname: process.env.HOST ?? "127.0.0.1",
  port: resolvePort(process.env.PORT),
  fetch: app.fetch,
};
