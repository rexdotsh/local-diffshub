import type {
  DiffIndicators as PierreDiffIndicators,
  HunkSeparators as PierreHunkSeparators,
} from "@pierre/diffs";

export type DiffStyle = "split" | "unified";
export type OverflowMode = "scroll" | "wrap";
// `custom` is deprecated upstream.
export type HunkSeparatorStyle = Exclude<PierreHunkSeparators, "custom">;
export type DiffIndicators = PierreDiffIndicators;
