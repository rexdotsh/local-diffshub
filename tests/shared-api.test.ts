import { describe, expect, test } from "bun:test";

import { appStateSchema, updatePreferencesRequestSchema } from "@/shared/api";

describe("appStateSchema", () => {
  test("fills default state", () => {
    expect(appStateSchema.parse({})).toEqual({
      preferences: {
        collapseMode: "expanded",
        colorMode: "system",
        darkTheme: "diffhub-dark",
        diffIndicators: "bars",
        diffStyle: "split",
        hunkSeparators: "line-info",
        lightTheme: "diffhub-light",
        lineNumbers: true,
        overflow: "scroll",
        showBackgrounds: true,
      },
      recentProjects: [],
    });
  });
});

describe("updatePreferencesRequestSchema", () => {
  test("keeps preference updates partial", () => {
    expect(updatePreferencesRequestSchema.parse({})).toEqual({});
    expect(
      updatePreferencesRequestSchema.parse({ collapseMode: "collapsed" })
    ).toEqual({ collapseMode: "collapsed" });
  });
});
