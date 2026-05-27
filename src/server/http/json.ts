import type { z } from "zod";

import { createBadRequest } from "./errors";

const MAX_JSON_BYTES = 64 * 1024;

export async function parseJsonBody<TSchema extends z.ZodType>(
  request: Request,
  schema: TSchema,
  invalidMessage: string
): Promise<z.output<TSchema>> {
  if (!isJsonContentType(request.headers.get("content-type"))) {
    throw createBadRequest("Request body must be JSON.");
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength != null && Number(contentLength) > MAX_JSON_BYTES) {
    throw createBadRequest("Request body is too large.");
  }

  const text = await readLimitedJsonText(request);

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw createBadRequest("Request body must be valid JSON.");
  }

  const body = schema.safeParse(json);
  if (!body.success) {
    throw createBadRequest(invalidMessage);
  }
  return body.data;
}

function isJsonContentType(contentType: string | null): boolean {
  return contentType?.toLowerCase().includes("application/json") === true;
}

async function readLimitedJsonText(request: Request): Promise<string> {
  if (request.body == null) {
    return "";
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let byteLength = 0;
  let text = "";

  try {
    for (;;) {
      const result = await reader.read();
      if (result.done) {
        break;
      }

      byteLength += result.value.byteLength;
      if (byteLength > MAX_JSON_BYTES) {
        throw createBadRequest("Request body is too large.");
      }
      text += decoder.decode(result.value, { stream: true });
    }

    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}
