import { memo } from "react";

import type {
  BranchSummary,
  CommitSummary,
  DiffMode,
  ProjectSummary,
  RecentProject,
  WorktreeSummary,
} from "../../shared/api";
import type { DiffStyle, OverflowMode } from "../types";
import { ModeTabs } from "./mode-tabs";
import { ProjectMenu } from "./project-menu";
import { RefMenu } from "./ref-menu";
import { ViewMenu } from "./view-menu";

type HeaderProps = {
  branches: BranchSummary[];
  commits: CommitSummary[];
  diffStyle: DiffStyle;
  mode: DiffMode;
  onChangeDiffStyle(style: DiffStyle): void;
  onChangeMode(mode: DiffMode): void;
  onChangeOverflow(overflow: OverflowMode): void;
  onOpenProject(path: string): void;
  onReload(): void;
  onSelectBranch(branch: string): void;
  onSelectCommit(commit: string): void;
  overflow: OverflowMode;
  project: ProjectSummary | null;
  recentProjects: RecentProject[];
  selectedBranch: string | undefined;
  selectedCommit: string | undefined;
  worktrees: WorktreeSummary[];
};

export const Header = memo(function Header({
  branches,
  commits,
  diffStyle,
  mode,
  onChangeDiffStyle,
  onChangeMode,
  onChangeOverflow,
  onOpenProject,
  onReload,
  onSelectBranch,
  onSelectCommit,
  overflow,
  project,
  recentProjects,
  selectedBranch,
  selectedCommit,
  worktrees,
}: HeaderProps) {
  return (
    <header className="z-10 flex h-12 items-center gap-2 border-b border-border/60 bg-[var(--app-header-bg)] px-3">
      <span
        aria-label="Local Diffhub"
        className="inline-flex size-7 items-center justify-center rounded-md border border-border/70 bg-card/40 text-[10px] font-bold tracking-tight"
        role="img"
        title="Local Diffhub"
      >
        DH
      </span>
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
      <div className="ml-auto" />
      <ViewMenu
        diffStyle={diffStyle}
        onChangeDiffStyle={onChangeDiffStyle}
        onChangeOverflow={onChangeOverflow}
        onReload={onReload}
        overflow={overflow}
      />
    </header>
  );
});
