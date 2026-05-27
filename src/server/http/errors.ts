import { HTTPException } from "hono/http-exception";

import type { ApiErrorCode, ApiErrorResponse } from "@/shared/api";

export function createApiErrorResponse(
  error: ApiErrorCode,
  message: string
): ApiErrorResponse {
  return { error, message };
}

export function createBadRequest(message: string): HTTPException {
  return new HTTPException(400, { message });
}
