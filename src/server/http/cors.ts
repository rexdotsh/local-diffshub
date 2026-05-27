import type { MiddlewareHandler } from "hono";

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export function localCors(): MiddlewareHandler {
  return async (context, next) => {
    const origin = context.req.header("origin");
    if (origin != null && isTrustedOrigin(context.req.raw)) {
      context.header("Access-Control-Allow-Origin", origin);
      context.header("Access-Control-Allow-Credentials", "true");
      context.header(
        "Access-Control-Allow-Headers",
        "accept, authorization, content-type"
      );
      context.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PATCH, OPTIONS"
      );
      context.header("Vary", "Origin");
    }

    if (context.req.method.toUpperCase() === "OPTIONS") {
      return context.body(null, 204);
    }

    await next();
  };
}

export function isTrustedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin == null || host == null) {
    return false;
  }

  const originHostname = parseUrlHostname(origin);
  const hostHostname = parseHostHeaderHostname(host);
  if (originHostname == null || hostHostname == null) {
    return false;
  }

  return (
    originHostname === hostHostname ||
    (isLoopbackHostname(originHostname) && isLoopbackHostname(hostHostname))
  );
}

export function isLoopbackHostname(hostname: string): boolean {
  return LOCAL_HOSTNAMES.has(hostname);
}

function parseUrlHostname(value: string): string | null {
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

function parseHostHeaderHostname(value: string): string | null {
  try {
    return new URL(`http://${value}`).hostname;
  } catch {
    return null;
  }
}
