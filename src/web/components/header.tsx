import { IconFileTreeFill, IconRefresh } from "@pierre/icons";
import { memo, type CSSProperties } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  BranchSummary,
  CommitSummary,
  ProjectSummary,
  RecentProject,
  WorktreeSummary,
} from "../../shared/api";
import type { ColorMode, DarkTheme, LightTheme } from "../data/themes";
import type {
  DiffIndicators,
  DiffStyle,
  HunkSeparatorStyle,
  OverflowMode,
} from "../types";
import { type ChangesScope, ModePills, type ViewKind } from "./mode-pills";
import { ProjectMenu } from "./project-menu";
import { ThemeMenu } from "./theme-menu";
import { ViewMenu } from "./view-menu";

type HeaderProps = {
  branch: string | undefined;
  branches: BranchSummary[];
  chromeStyle?: CSSProperties | undefined;
  collapseMode: "expanded" | "collapsed";
  colorMode: ColorMode;
  commit: string | undefined;
  commits: readonly CommitSummary[];
  darkTheme: DarkTheme;
  defaultBranchName: string;
  diffIndicators: DiffIndicators;
  diffStyle: DiffStyle;
  fileTreeAvailable: boolean;
  fileTreeOverlayOpen: boolean;
  hunkSeparators: HunkSeparatorStyle;
  lightTheme: LightTheme;
  lineNumbers: boolean;
  onChangeCollapseMode(mode: "expanded" | "collapsed"): void;
  onChangeColorMode(mode: ColorMode): void;
  onChangeDarkTheme(theme: DarkTheme): void;
  onChangeDiffIndicators(indicators: DiffIndicators): void;
  onChangeDiffStyle(style: DiffStyle): void;
  onChangeHunkSeparators(separators: HunkSeparatorStyle): void;
  onChangeLightTheme(theme: LightTheme): void;
  onChangeLineNumbers(enabled: boolean): void;
  onChangeOverflow(overflow: OverflowMode): void;
  onChangeScope(scope: ChangesScope): void;
  onChangeShowBackgrounds(show: boolean): void;
  onOpenProject(path: string): Promise<void>;
  onRefresh(): void;
  onSelectBranch(branch: string): void;
  onSelectCommit(commit: string | undefined): void;
  onToggleFileTreeOverlay(): void;
  overflow: OverflowMode;
  project: ProjectSummary | null;
  recentProjects: RecentProject[];
  scope: ChangesScope;
  showBackgrounds: boolean;
  staleAt: number | null;
  view: ViewKind;
  worktrees: WorktreeSummary[];
};

export const Header = memo(function Header({
  branch,
  branches,
  chromeStyle,
  collapseMode,
  colorMode,
  commit,
  commits,
  darkTheme,
  defaultBranchName,
  diffIndicators,
  diffStyle,
  fileTreeAvailable,
  fileTreeOverlayOpen,
  hunkSeparators,
  lightTheme,
  lineNumbers,
  onChangeCollapseMode,
  onChangeColorMode,
  onChangeDarkTheme,
  onChangeDiffIndicators,
  onChangeDiffStyle,
  onChangeHunkSeparators,
  onChangeLightTheme,
  onChangeLineNumbers,
  onChangeOverflow,
  onChangeScope,
  onChangeShowBackgrounds,
  onOpenProject,
  onRefresh,
  onSelectBranch,
  onSelectCommit,
  onToggleFileTreeOverlay,
  overflow,
  project,
  recentProjects,
  scope,
  showBackgrounds,
  staleAt,
  view,
  worktrees,
}: HeaderProps) {
  return (
    <header
      className={cn(
        "z-10 flex min-h-11 flex-wrap items-center gap-1.5 border-b border-[var(--color-border-opaque,var(--border))] px-2 py-1.5 md:h-11 md:flex-nowrap md:gap-2 md:py-0",
        chromeStyle == null && "bg-[var(--app-header-bg)]"
      )}
      style={chromeStyle}
    >
      <ProjectMenu
        className="min-w-0 max-w-[40vw] md:max-w-none"
        onOpen={onOpenProject}
        project={project}
        recentProjects={recentProjects}
        worktrees={worktrees}
      />
      <ModePills
        branch={branch}
        branches={branches}
        className="no-scrollbar order-last w-full overflow-x-auto md:order-none md:w-auto md:overflow-visible"
        commit={commit}
        commits={commits}
        defaultBranchName={defaultBranchName}
        onChangeScope={onChangeScope}
        onSelectBranch={onSelectBranch}
        onSelectCommit={onSelectCommit}
        scope={scope}
        view={view}
      />
      <div className="inline-flex items-center gap-0.5 md:ml-auto">
        {staleAt != null ? (
          <Button
            aria-label="Refresh diff"
            className="h-7 gap-1 border border-amber-500/40 bg-amber-500/10 px-2 text-[10px] text-amber-300 hover:bg-amber-500/20"
            onClick={onRefresh}
            size="sm"
            title="Changes detected — click to refresh diff (R)"
            type="button"
            variant="ghost"
          >
            <IconRefresh aria-hidden className="size-3" />
            Refresh
          </Button>
        ) : null}
        <Button
          aria-label={fileTreeOverlayOpen ? "Hide file tree" : "Show file tree"}
          aria-pressed={fileTreeOverlayOpen}
          className="md:hidden"
          disabled={!fileTreeAvailable}
          onClick={onToggleFileTreeOverlay}
          size="icon"
          title={fileTreeOverlayOpen ? "Hide file tree" : "Show file tree"}
          type="button"
          variant="ghost"
        >
          <IconFileTreeFill aria-hidden />
        </Button>
        <ThemeMenu
          colorMode={colorMode}
          contentStyle={chromeStyle}
          darkTheme={darkTheme}
          lightTheme={lightTheme}
          onChangeColorMode={onChangeColorMode}
          onChangeDarkTheme={onChangeDarkTheme}
          onChangeLightTheme={onChangeLightTheme}
        />
        <ViewMenu
          collapseMode={collapseMode}
          contentStyle={chromeStyle}
          diffIndicators={diffIndicators}
          diffStyle={diffStyle}
          hunkSeparators={hunkSeparators}
          lineNumbers={lineNumbers}
          onChangeCollapseMode={onChangeCollapseMode}
          onChangeDiffIndicators={onChangeDiffIndicators}
          onChangeDiffStyle={onChangeDiffStyle}
          onChangeHunkSeparators={onChangeHunkSeparators}
          onChangeLineNumbers={onChangeLineNumbers}
          onChangeOverflow={onChangeOverflow}
          onChangeShowBackgrounds={onChangeShowBackgrounds}
          onReload={onRefresh}
          overflow={overflow}
          showBackgrounds={showBackgrounds}
        />
      </div>
    </header>
  );
});
