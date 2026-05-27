import { timingSafeEqual } from "node:crypto";
import type { MiddlewareHandler } from "hono";

import { isLoopbackHostname, isTrustedOrigin } from "./cors";
import { createApiErrorResponse } from "./errors";

const AUTH_REALM = "Local Diffhub";
const BASIC_PREFIX = "Basic ";
export type AuthConfig = {
  allowLocalhostBypass: boolean;
  password: string | undefined;
  user: string | undefined;
};

type Credentials = {
  password: string;
  user: string;
};

export function readAuthConfig(hostname: string): AuthConfig {
  return {
    allowLocalhostBypass: isLoopbackHostname(hostname),
    user: process.env.LOCAL_DIFFHUB_USER,
    password: process.env.LOCAL_DIFFHUB_PASSWORD,
  };
}

export function requireAccess(config: AuthConfig): MiddlewareHandler {
  const credentials = normalizeCredentials(config);

  return async (context, next) => {
    if (isCrossSiteMutation(context.req.raw)) {
      return context.json(
        createApiErrorResponse(
          "forbidden",
          "Cross-site requests are not allowed."
        ),
        403
      );
    }

    if (credentials == null) {
      if (
        config.allowLocalhostBypass &&
        !hasForwardedHost(context.req.raw.headers) &&
        isLocalhostRequest(context.req.header("host"))
      ) {
        await next();
        return;
      }

      return context.json(
        createApiErrorResponse("unauthorized", "Basic auth is required."),
        401,
        unauthorizedHeaders()
      );
    }

    const authorization = context.req.header("authorization");
    if (
      authorization == null ||
      !isValidBasicAuth(authorization, credentials)
    ) {
      return context.json(
        createApiErrorResponse("unauthorized", "Invalid credentials."),
        401,
        unauthorizedHeaders()
      );
    }

    await next();
  };
}

function normalizeCredentials(config: AuthConfig): Credentials | null {
  if (config.user == null || config.password == null) {
    return null;
  }

  if (config.user === "" || config.password === "") {
    return null;
  }

  return { user: config.user, password: config.password };
}

function isValidBasicAuth(
  authorization: string,
  credentials: Credentials
): boolean {
  if (!authorization.startsWith(BASIC_PREFIX)) {
    return false;
  }

  const decoded = decodeBase64(authorization.slice(BASIC_PREFIX.length));
  if (decoded == null) {
    return false;
  }

  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex === -1) {
    return false;
  }

  const user = decoded.slice(0, separatorIndex);
  const password = decoded.slice(separatorIndex + 1);
  return (
    safeEqual(user, credentials.user) &&
    safeEqual(password, credentials.password)
  );
}

function decodeBase64(value: string): string | null {
  try {
    return Buffer.from(value, "base64").toString("utf8");
  } catch {
    return null;
  }
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.byteLength !== rightBuffer.byteLength) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function isLocalhostRequest(hostHeader: string | undefined): boolean {
  if (hostHeader == null) {
    return false;
  }

  let hostname: string;
  try {
    hostname = new URL(`http://${hostHeader}`).hostname;
  } catch {
    return false;
  }

  return isLoopbackHostname(hostname);
}

function hasForwardedHost(headers: Headers): boolean {
  return (
    headers.has("cf-connecting-ip") ||
    headers.has("x-forwarded-for") ||
    headers.has("x-forwarded-host")
  );
}

function isCrossSiteMutation(request: Request): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase())) {
    return false;
  }

  if (isTrustedOrigin(request)) {
    return false;
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (
    fetchSite != null &&
    fetchSite !== "same-origin" &&
    fetchSite !== "same-site" &&
    fetchSite !== "none"
  ) {
    return true;
  }

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin == null || host == null) {
    return false;
  }

  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

function unauthorizedHeaders(): { "WWW-Authenticate": string } {
  return {
    "WWW-Authenticate": `Basic realm="${AUTH_REALM}", charset="UTF-8"`,
  };
}
