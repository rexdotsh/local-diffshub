import { z } from "zod";

export type HealthResponse = {
  ok: boolean;
  service: "local-diffhub";
};

export type ApiErrorCode =
  | "bad_request"
  | "internal_error"
  | "forbidden"
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

export const openProjectRequestSchema = z.strictObject({
  path: projectPathSchema,
});

export const defaultBranchSchema = z.object({
  name: z.string().min(1),
  ref: z.string().min(1),
  source: z.enum(["origin_head", "local_main", "local_master", "current"]),
});

export const projectSummarySchema = z.object({
  path: projectPathSchema,
  repoRoot: z.string().min(1),
  gitDir: z.string().min(1),
  commonDir: z.string().min(1),
  currentBranch: z.string().min(1).nullable(),
  defaultBranch: defaultBranchSchema,
  isWorktree: z.boolean(),
});

export type RecentProject = z.output<typeof recentProjectSchema>;
export type AppPreferences = z.output<typeof appPreferencesSchema>;
export type AppState = z.output<typeof appStateSchema>;
export type UpsertRecentProjectRequest = z.output<
  typeof upsertRecentProjectRequestSchema
>;
export type OpenProjectRequest = z.output<typeof openProjectRequestSchema>;
export type DefaultBranch = z.output<typeof defaultBranchSchema>;
export type ProjectSummary = z.output<typeof projectSummarySchema>;
