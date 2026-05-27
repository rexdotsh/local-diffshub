import { describe, expect, test } from "bun:test";
import { Hono } from "hono";

import { requireAccess, type AuthConfig } from "../src/server/http/auth";

function createAuthApp(config: AuthConfig): Hono {
  const app = new Hono();
  app.use("*", requireAccess(config));
  app.get("/ok", (context) => context.text("ok"));
  return app;
}

function basicAuth(user: string, password: string): string {
  return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
}

describe("requireAccess", () => {
  test("allows localhost without credentials when bypass is enabled", async () => {
    const app = createAuthApp({
      allowLocalhostBypass: true,
      password: undefined,
      user: undefined,
    });

    const response = await app.request("/ok", {
      headers: { host: "localhost:3003" },
    });

    expect(response.status).toBe(200);
  });

  test("rejects forwarded localhost requests without credentials", async () => {
    const app = createAuthApp({
      allowLocalhostBypass: true,
      password: undefined,
      user: undefined,
    });

    const response = await app.request("/ok", {
      headers: {
        host: "localhost:3003",
        "x-forwarded-for": "203.0.113.1",
      },
    });

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain("Basic");
  });

  test("requires credentials when localhost bypass is disabled", async () => {
    const app = createAuthApp({
      allowLocalhostBypass: false,
      password: undefined,
      user: undefined,
    });

    const response = await app.request("/ok", {
      headers: { host: "localhost:3003" },
    });

    expect(response.status).toBe(401);
  });

  test("blocks cross-site browser mutations", async () => {
    const app = createAuthApp({
      allowLocalhostBypass: true,
      password: undefined,
      user: undefined,
    });

    const response = await app.request("/ok", {
      method: "POST",
      headers: {
        host: "localhost:3003",
        origin: "https://example.com",
      },
    });

    expect(response.status).toBe(403);
  });

  test("accepts matching basic auth credentials", async () => {
    const app = createAuthApp({
      allowLocalhostBypass: false,
      password: "secret",
      user: "majdoor",
    });

    const response = await app.request("/ok", {
      headers: { authorization: basicAuth("majdoor", "secret") },
    });

    expect(response.status).toBe(200);
  });
});
