import { readFile } from "node:fs/promises";
import { serveStatic } from "hono/bun";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { fileURLToPath } from "node:url";

import type { HealthResponse } from "../shared/api";
import { readAuthConfig, requireAccess } from "./http/auth";
import { createApiErrorResponse } from "./http/errors";
import { createProjectRoutes } from "./routes/projects";
import { createStateRoutes } from "./routes/state";
import { createStateStore } from "./state/store";

const DEFAULT_PORT = 3003;
const hostname = process.env.HOST ?? "127.0.0.1";
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
const stateStore = createStateStore();

app.use("*", async (context, next) => {
  context.header("X-Content-Type-Options", "nosniff");
  context.header("Referrer-Policy", "same-origin");
  context.header(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  context.header(
    "Content-Security-Policy",
    "default-src 'self'; base-uri 'none'; object-src 'none'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'"
  );
  await next();
});

app.onError((error, context) => {
  if (error instanceof HTTPException) {
    return context.json(
      createApiErrorResponse(
        error.status === 400 ? "bad_request" : "request_error",
        error.message
      ),
      error.status
    );
  }

  console.error(error);
  return context.json(
    createApiErrorResponse("internal_error", "Internal server error"),
    500
  );
});

app.use("*", requireAccess(readAuthConfig(hostname)));

app.get("/api/health", (context) => {
  const health: HealthResponse = {
    ok: true,
    service: "local-diffhub",
  };
  return context.json(health);
});

app.route("/api/state", createStateRoutes(stateStore));
app.route("/api/projects", createProjectRoutes(stateStore));

app.use("/*", serveStatic({ root: clientDistPath }));

app.notFound(async (context) => {
  const requestUrl = new URL(context.req.url);
  if (requestUrl.pathname.startsWith("/api/")) {
    return context.json(
      createApiErrorResponse("not_found", "API route not found"),
      404
    );
  }

  if (!isSpaNavigationRequest(context.req.raw)) {
    return context.text("Not found", 404);
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
  hostname,
  port: resolvePort(process.env.PORT),
  fetch: app.fetch,
};

function isSpaNavigationRequest(request: Request): boolean {
  const method = request.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    return false;
  }

  return request.headers.get("accept")?.includes("text/html") === true;
}
