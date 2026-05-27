import { z } from "zod";

export type HealthResponse = {
  ok: boolean;
  service: "local-diffhub";
};

export type ApiErrorCode =
  | "bad_request"
  | "internal_error"
  | "not_found"
  | "request_error"
  | "unauthorized";

export type ApiErrorResponse = {
  error: ApiErrorCode;
  message: string;
};

const projectPathSchema = z.string().min(1);
const projectNameSchema = z.string().min(1);

export const recentProjectSchema = z.object({
  path: projectPathSchema,
  name: projectNameSchema,
  lastOpenedAt: z.string().datetime(),
});

export const appPreferencesSchema = z.object({
  lastProjectPath: z.string().min(1).optional(),
  sidebarCollapsed: z.boolean().default(false),
});

export const appStateSchema = z.object({
  recentProjects: z.array(recentProjectSchema).default([]),
  preferences: appPreferencesSchema.default({ sidebarCollapsed: false }),
});

export const upsertRecentProjectRequestSchema = z.strictObject({
  path: projectPathSchema,
  name: projectNameSchema.optional(),
});

export type RecentProject = z.output<typeof recentProjectSchema>;
export type AppPreferences = z.output<typeof appPreferencesSchema>;
export type AppState = z.output<typeof appStateSchema>;
export type UpsertRecentProjectRequest = z.output<
  typeof upsertRecentProjectRequestSchema
>;
