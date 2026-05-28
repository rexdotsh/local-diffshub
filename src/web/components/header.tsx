import { memo, type CSSProperties } from "react";

import { cn } from "@/lib/utils";
import type {
  BranchSummary,
  CommitSummary,
  DiffMode,
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
import { ModeTabs } from "./mode-tabs";
import { ProjectMenu } from "./project-menu";
import { RefMenu } from "./ref-menu";
import { ThemeMenu } from "./theme-menu";
import { ViewMenu } from "./view-menu";

type HeaderProps = {
  branches: BranchSummary[];
  chromeStyle?: CSSProperties | undefined;
  collapseMode: "expanded" | "collapsed";
  colorMode: ColorMode;
  commits: CommitSummary[];
  darkTheme: DarkTheme;
  diffIndicators: DiffIndicators;
  diffStyle: DiffStyle;
  hunkSeparators: HunkSeparatorStyle;
  lightTheme: LightTheme;
  lineNumbers: boolean;
  mode: DiffMode;
  onChangeCollapseMode(mode: "expanded" | "collapsed"): void;
  onChangeColorMode(mode: ColorMode): void;
  onChangeDarkTheme(theme: DarkTheme): void;
  onChangeDiffIndicators(indicators: DiffIndicators): void;
  onChangeDiffStyle(style: DiffStyle): void;
  onChangeHunkSeparators(separators: HunkSeparatorStyle): void;
  onChangeLightTheme(theme: LightTheme): void;
  onChangeLineNumbers(enabled: boolean): void;
  onChangeMode(mode: DiffMode): void;
  onChangeOverflow(overflow: OverflowMode): void;
  onChangeShowBackgrounds(show: boolean): void;
  onOpenProject(path: string): void;
  onReload(): void;
  onSelectBranch(branch: string): void;
  onSelectCommit(commit: string): void;
  overflow: OverflowMode;
  project: ProjectSummary | null;
  recentProjects: RecentProject[];
  selectedBranch: string | undefined;
  selectedCommit: string | undefined;
  showBackgrounds: boolean;
  worktrees: WorktreeSummary[];
};

export const Header = memo(function Header({
  branches,
  chromeStyle,
  collapseMode,
  colorMode,
  commits,
  darkTheme,
  diffIndicators,
  diffStyle,
  hunkSeparators,
  lightTheme,
  lineNumbers,
  mode,
  onChangeCollapseMode,
  onChangeColorMode,
  onChangeDarkTheme,
  onChangeDiffIndicators,
  onChangeDiffStyle,
  onChangeHunkSeparators,
  onChangeLightTheme,
  onChangeLineNumbers,
  onChangeMode,
  onChangeOverflow,
  onChangeShowBackgrounds,
  onOpenProject,
  onReload,
  onSelectBranch,
  onSelectCommit,
  overflow,
  project,
  recentProjects,
  selectedBranch,
  selectedCommit,
  showBackgrounds,
  worktrees,
}: HeaderProps) {
  return (
    <header
      className={cn(
        "z-10 flex h-11 items-center gap-2 border-b border-[var(--color-border-opaque,var(--border))] px-3",
        chromeStyle == null && "bg-[var(--app-header-bg)]"
      )}
      style={chromeStyle}
    >
      <ProjectMenu
        onOpen={onOpenProject}
        project={project}
        recentProjects={recentProjects}
        worktrees={worktrees}
      />
      <ModeTabs mode={mode} onChange={onChangeMode} />
      <RefMenu
        branches={branches}
        commits={commits}
        mode={mode}
        onSelectBranch={onSelectBranch}
        onSelectCommit={onSelectCommit}
        selectedBranch={selectedBranch}
        selectedCommit={selectedCommit}
      />
      <div className="ml-auto inline-flex items-center gap-0.5">
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
          onReload={onReload}
          overflow={overflow}
          showBackgrounds={showBackgrounds}
        />
      </div>
    </header>
  );
});
