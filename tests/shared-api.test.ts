import { describe, expect, test } from "bun:test";

import { appStateSchema, updatePreferencesRequestSchema } from "@/shared/api";

describe("appStateSchema", () => {
  test("fills default state", () => {
    expect(appStateSchema.parse({})).toEqual({
      preferences: {
        diffStyle: "split",
        overflow: "scroll",
        selectedMode: "combined",
        sidebarCollapsed: false,
      },
      recentProjects: [],
    });
  });
});

describe("updatePreferencesRequestSchema", () => {
  test("keeps preference updates partial", () => {
    expect(updatePreferencesRequestSchema.parse({})).toEqual({});
    expect(
      updatePreferencesRequestSchema.parse({ selectedMode: "staged" })
    ).toEqual({ selectedMode: "staged" });
  });
});
