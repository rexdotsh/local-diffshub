import { describe, expect, test } from "bun:test";

import { createGitPatchFileStreamParser } from "../src/web/git-patch-stream";

describe("createGitPatchFileStreamParser", () => {
  test("splits multiple git patch files", () => {
    const parser = createGitPatchFileStreamParser();

    parser.push(
      "diff --git a/a.txt b/a.txt\n--- a/a.txt\n+++ b/a.txt\n@@ -1 +1 @@\n-a\n+b\n"
    );
    parser.push(
      "diff --git a/b.txt b/b.txt\n--- a/b.txt\n+++ b/b.txt\n@@ -1 +1 @@\n-c\n+d\n"
    );

    expect(parser.takeAvailableFile()).toContain("a/a.txt");
    expect(parser.finish()).toContain("a/b.txt");
  });

  test("handles chunk splits inside file boundaries", () => {
    const parser = createGitPatchFileStreamParser();

    parser.push("diff --g");
    parser.push("it a/a.txt b/a.txt\n@@ -1 +1 @@\n-a\n+b");

    expect(parser.finish()).toContain("diff --git a/a.txt b/a.txt");
  });

  test("ignores whitespace-only streams", () => {
    const parser = createGitPatchFileStreamParser();

    parser.push("\n\n");

    expect(parser.finish()).toBeUndefined();
  });
});
