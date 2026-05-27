import { describe, expect, test } from "bun:test";

import { appStateSchema } from "@/shared/api";

describe("appStateSchema", () => {
  test("fills default state", () => {
    expect(appStateSchema.parse({})).toEqual({
      preferences: {
        sidebarCollapsed: false,
      },
      recentProjects: [],
    });
  });
});
