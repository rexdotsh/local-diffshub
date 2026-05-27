import type { CodeViewItem, CodeViewOptions } from "@pierre/diffs";
import { CodeView, type CodeViewHandle } from "@pierre/diffs/react";
import { type RefObject, useMemo } from "react";

import type { DiffStyle, OverflowMode } from "../types";

const CODE_VIEW_LAYOUT = { gap: 1, paddingBottom: 0, paddingTop: 0 };
const PIERRE_THEME = { dark: "pierre-dark-soft", light: "pierre-light-soft" };

type CodeViewWrapperProps = {
  diffStyle: DiffStyle;
  items: readonly CodeViewItem[];
  overflow: OverflowMode;
  viewerKey: number;
  viewerRef: RefObject<CodeViewHandle<undefined> | null>;
};

export function CodeViewWrapper({
  diffStyle,
  items,
  overflow,
  viewerKey,
  viewerRef,
}: CodeViewWrapperProps) {
  const options = useMemo<CodeViewOptions<undefined>>(
    () => ({
      diffIndicators: "bars",
      diffStyle,
      enableLineSelection: true,
      layout: CODE_VIEW_LAYOUT,
      lineHoverHighlight: "number",
      overflow,
      stickyHeaders: true,
      theme: PIERRE_THEME,
      themeType: "dark",
    }),
    [diffStyle, overflow]
  );

  return (
    <CodeView<undefined>
      className="cv-scrollbar relative h-full min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-clip overscroll-contain [contain:strict] [overflow-anchor:none] [will-change:scroll-position]"
      items={items}
      key={viewerKey}
      options={options}
      ref={viewerRef}
    />
  );
}
