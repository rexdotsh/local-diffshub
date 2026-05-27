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

export const projectPathRequestSchema = z.strictObject({
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

export const branchSummarySchema = z.object({
  commit: z.string().min(1),
  current: z.boolean(),
  name: z.string().min(1),
  ref: z.string().min(1),
  type: z.enum(["local", "remote"]),
  upstream: z.string().min(1).nullable(),
});

export const branchesResponseSchema = z.object({
  branches: z.array(branchSummarySchema),
});

export const worktreeSummarySchema = z.object({
  branch: z.string().min(1).nullable(),
  commit: z.string().min(1).nullable(),
  detached: z.boolean(),
  path: z.string().min(1),
});

export const worktreesResponseSchema = z.object({
  worktrees: z.array(worktreeSummarySchema),
});

export const statusEntrySchema = z.object({
  originalPath: z.string().min(1).nullable(),
  path: z.string().min(1),
  staged: z.string().min(1),
  unstaged: z.string().min(1),
});

export const statusSummarySchema = z.object({
  ahead: z.number().int().nonnegative(),
  behind: z.number().int().nonnegative(),
  branch: z.string().min(1).nullable(),
  conflicted: z.number().int().nonnegative(),
  entries: z.array(statusEntrySchema),
  staged: z.number().int().nonnegative(),
  unstaged: z.number().int().nonnegative(),
  untracked: z.number().int().nonnegative(),
});

export const statusResponseSchema = z.object({
  status: statusSummarySchema,
});

export const diffModeSchema = z.enum([
  "branch",
  "staged",
  "unstaged",
  "combined",
  "full",
]);

export const diffStreamRequestSchema = z.discriminatedUnion("mode", [
  z.strictObject({
    path: projectPathSchema,
    mode: z.literal("branch"),
    branch: z.string().min(1),
  }),
  z.strictObject({ path: projectPathSchema, mode: z.literal("staged") }),
  z.strictObject({ path: projectPathSchema, mode: z.literal("unstaged") }),
  z.strictObject({ path: projectPathSchema, mode: z.literal("combined") }),
  z.strictObject({
    path: projectPathSchema,
    mode: z.literal("full"),
    branch: z.string().min(1).optional(),
  }),
]);

export const projectChangeEventSchema = z.object({
  changedPath: z.string().min(1),
  repoRoot: z.string().min(1),
  timestamp: z.string().datetime(),
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
export type ProjectPathRequest = z.output<typeof projectPathRequestSchema>;
export type BranchSummary = z.output<typeof branchSummarySchema>;
export type BranchesResponse = z.output<typeof branchesResponseSchema>;
export type WorktreeSummary = z.output<typeof worktreeSummarySchema>;
export type WorktreesResponse = z.output<typeof worktreesResponseSchema>;
export type StatusEntry = z.output<typeof statusEntrySchema>;
export type StatusSummary = z.output<typeof statusSummarySchema>;
export type StatusResponse = z.output<typeof statusResponseSchema>;
export type DiffMode = z.output<typeof diffModeSchema>;
export type DiffStreamRequest = z.output<typeof diffStreamRequestSchema>;
export type ProjectChangeEvent = z.output<typeof projectChangeEventSchema>;
