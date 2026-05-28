import type { CodeViewLineSelection } from "@pierre/diffs";
import { useWorkerPool } from "@pierre/diffs/react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { TooltipProvider } from "@/components/ui/tooltip";
import type {
  DiffMode,
  RecentProject,
  UpdatePreferencesRequest,
} from "../shared/api";
import { loadAppState, updatePreferences } from "./api";
import { CodeViewWrapper } from "./components/code-view";
import { Header } from "./components/header";
import { type ChangesScope, isChangesScope } from "./components/mode-pills";
import { Sidebar } from "./components/sidebar";
import { StatusPanel } from "./components/status-panel";
import {
  formatLineHash,
  parseLineHash,
  replaceLocationHash,
} from "./data/line-hash";
import { type CollapseMode, useDiffSession } from "./data/use-diff-session";
import { usePersistedState } from "./data/use-persisted-state";
import { useProject } from "./data/use-project";
import {
  useResolvedColorMode,
  useThemeChromeStyle,
} from "./data/use-theme-chrome";
import {
  type ColorMode,
  COLOR_MODES,
  DARK_THEMES,
  type DarkTheme,
  DEFAULT_DARK_THEME,
  DEFAULT_LIGHT_THEME,
  LIGHT_THEMES,
  type LightTheme,
} from "./data/themes";
import type {
  DiffIndicators,
  DiffStyle,
  HunkSeparatorStyle,
  OverflowMode,
} from "./types";

type AppBootstrap = {
  collapseMode: CollapseMode;
  colorMode: ColorMode;
  darkTheme: DarkTheme;
  diffIndicators: DiffIndicators;
  diffStyle: DiffStyle;
  hunkSeparators: HunkSeparatorStyle;
  initialPath: string | undefined;
  lightTheme: LightTheme;
  lineNumbers: boolean;
  mode: DiffMode;
  overflow: OverflowMode;
  recentProjects: readonly RecentProject[];
  showBackgrounds: boolean;
};

const DEFAULT_BOOTSTRAP: AppBootstrap = {
  collapseMode: "expanded",
  colorMode: "system",
  darkTheme: DEFAULT_DARK_THEME,
  diffIndicators: "bars",
  diffStyle: "split",
  hunkSeparators: "line-info",
  initialPath: undefined,
  lightTheme: DEFAULT_LIGHT_THEME,
  lineNumbers: true,
  mode: "combined",
  overflow: "scroll",
  recentProjects: [],
  showBackgrounds: true,
};

export function App() {
  const [bootstrap, setBootstrap] = useState<AppBootstrap | null>(null);

  useEffect(() => {
    let mounted = true;
    loadAppState()
      .then((state) => {
        if (!mounted) return;
        const p = state.preferences;
        const lightTheme = (LIGHT_THEMES as readonly string[]).includes(
          p.lightTheme
        )
          ? (p.lightTheme as LightTheme)
          : DEFAULT_LIGHT_THEME;
        const darkTheme = (DARK_THEMES as readonly string[]).includes(
          p.darkTheme
        )
          ? (p.darkTheme as DarkTheme)
          : DEFAULT_DARK_THEME;
        setBootstrap({
          collapseMode: p.collapseMode,
          colorMode: p.colorMode,
          darkTheme,
          diffIndicators: p.diffIndicators,
          diffStyle: p.diffStyle,
          hunkSeparators: p.hunkSeparators,
          initialPath: p.lastProjectPath,
          lightTheme,
          lineNumbers: p.lineNumbers,
          mode: p.selectedMode,
          overflow: p.overflow,
          recentProjects: state.recentProjects,
          showBackgrounds: p.showBackgrounds,
        });
      })
      .catch(() => {
        if (mounted) setBootstrap(DEFAULT_BOOTSTRAP);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (bootstrap == null) return <div className="h-svh bg-background" />;
  return (
    <TooltipProvider>
      <AppShell bootstrap={bootstrap} />
    </TooltipProvider>
  );
}

function AppShell({ bootstrap }: { bootstrap: AppBootstrap }) {
  const project = useProject({
    initialPath: bootstrap.initialPath,
    initialRecentProjects: bootstrap.recentProjects,
  });

  const [mode, setMode] = useState<DiffMode>(bootstrap.mode);
  const [lastChangesScope, setLastChangesScope] = useState<ChangesScope>(() =>
    isChangesScope(bootstrap.mode) ? bootstrap.mode : "combined"
  );
  const [selectedBranch, setSelectedBranch] = useState<string | undefined>();
  const [selectedCommit, setSelectedCommit] = useState<string | undefined>();
  const [diffStyle, setDiffStyle] = useState<DiffStyle>(bootstrap.diffStyle);
  const [overflow, setOverflow] = useState<OverflowMode>(bootstrap.overflow);
  const [showBackgrounds, setShowBackgrounds] = useState(
    bootstrap.showBackgrounds
  );
  const [lineNumbers, setLineNumbers] = useState(bootstrap.lineNumbers);
  const [diffIndicators, setDiffIndicators] = useState<DiffIndicators>(
    bootstrap.diffIndicators
  );
  const [hunkSeparators, setHunkSeparators] = useState<HunkSeparatorStyle>(
    bootstrap.hunkSeparators
  );
  const [collapseMode, setCollapseMode] = useState<CollapseMode>(
    bootstrap.collapseMode
  );

  // Themes + color mode mirror to localStorage for optimistic restore.
  const [lightTheme, setLightTheme, lightHydrated] =
    usePersistedState<LightTheme>(
      "diffhub:light-theme",
      bootstrap.lightTheme,
      LIGHT_THEMES
    );
  const [darkTheme, setDarkTheme, darkHydrated] = usePersistedState<DarkTheme>(
    "diffhub:dark-theme",
    bootstrap.darkTheme,
    DARK_THEMES
  );
  const [colorMode, setColorMode] = usePersistedState<ColorMode>(
    "diffhub:color-mode",
    bootstrap.colorMode,
    COLOR_MODES
  );

  const resolvedColorMode = useResolvedColorMode(colorMode);
  const chromeStyle = useThemeChromeStyle(
    lightTheme,
    darkTheme,
    resolvedColorMode
  );

  // Push theme picks to WorkerPool so background tokenizers reload them;
  // gated on hydration to avoid kicking the workers twice on cold start.
  const workerPool = useWorkerPool();
  useLayoutEffect(() => {
    if (workerPool == null || !lightHydrated || !darkHydrated) return;
    workerPool
      .setRenderOptions({ theme: { dark: darkTheme, light: lightTheme } })
      .catch(() => undefined);
  }, [darkTheme, lightTheme, workerPool, lightHydrated, darkHydrated]);

  const repoRoot = project.project?.repoRoot;
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on repo swap.
  useEffect(() => {
    setSelectedBranch(undefined);
    setSelectedCommit(undefined);
  }, [repoRoot]);

  useEffect(() => {
    if (project.project == null) return;
    const summary = project.project;
    setSelectedBranch((current) => {
      if (current != null && project.branches.some((b) => b.name === current)) {
        return current;
      }
      return summary.currentBranch ?? summary.defaultBranch.ref;
    });
    setSelectedCommit((current) => {
      if (current != null && project.commits.some((c) => c.hash === current)) {
        return current;
      }
      return project.commits[0]?.hash;
    });
  }, [project.branches, project.commits, project.project]);

  const session = useDiffSession({
    branch: selectedBranch,
    collapseMode,
    commit: selectedCommit,
    enabled: project.project != null,
    mode,
    path: project.project?.repoRoot ?? "",
  });

  const [selectedLines, setSelectedLines] =
    useState<CodeViewLineSelection | null>(null);
  const appliedHashKeyRef = useRef<string | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on viewer remount.
  useEffect(() => {
    appliedHashKeyRef.current = null;
  }, [session.viewerKey]);

  const applyUrlHashTarget = useCallback(() => {
    const { hash } = window.location;
    const target = parseLineHash(hash);
    if (target == null) return;
    const applyKey = `${session.viewerKey}:${hash}`;
    if (appliedHashKeyRef.current === applyKey) return;
    const viewer = session.viewerRef.current;
    if (viewer == null) return;
    const item = viewer.getItem(target.itemId);
    if (item == null) return;
    if (item.collapsed === true) {
      item.collapsed = false;
      item.version = (typeof item.version === "number" ? item.version : 0) + 1;
      if (!viewer.updateItem(item)) return;
      viewer.getInstance()?.render(true);
    }
    viewer.setSelectedLines({ id: target.itemId, range: target.range });
    setSelectedLines({ id: target.itemId, range: target.range });
    viewer.scrollTo({
      align: "center",
      behavior: "instant",
      id: target.itemId,
      range: target.range,
      type: "range",
    });
    appliedHashKeyRef.current = applyKey;
  }, [session.viewerKey, session.viewerRef]);

  useEffect(() => {
    window.addEventListener("hashchange", applyUrlHashTarget);
    return () => window.removeEventListener("hashchange", applyUrlHashTarget);
  }, [applyUrlHashTarget]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-try as new batches stream in.
  useEffect(() => {
    if (session.loadState !== "ready" && session.loadState !== "streaming")
      return;
    applyUrlHashTarget();
  }, [applyUrlHashTarget, session.items, session.loadState]);

  const handleSelectedLinesChange = useCallback(
    (selection: CodeViewLineSelection | null) => {
      setSelectedLines(selection);
      const nextHash = selection == null ? null : formatLineHash(selection);
      replaceLocationHash(nextHash);
      appliedHashKeyRef.current =
        nextHash == null ? null : `${session.viewerKey}:${nextHash}`;
    },
    [session.viewerKey]
  );

  const persist = useCallback((next: UpdatePreferencesRequest) => {
    updatePreferences(next).catch(() => undefined);
  }, []);

  const handleChangeMode = useCallback(
    (next: DiffMode) => {
      setMode(next);
      if (isChangesScope(next)) setLastChangesScope(next);
      persist({ selectedMode: next });
    },
    [persist]
  );
  const handleChangeDiffStyle = useCallback(
    (next: DiffStyle) => {
      setDiffStyle(next);
      persist({ diffStyle: next });
    },
    [persist]
  );
  const handleChangeOverflow = useCallback(
    (next: OverflowMode) => {
      setOverflow(next);
      persist({ overflow: next });
    },
    [persist]
  );
  const handleChangeShowBackgrounds = useCallback(
    (next: boolean) => {
      setShowBackgrounds(next);
      persist({ showBackgrounds: next });
    },
    [persist]
  );
  const handleChangeLineNumbers = useCallback(
    (next: boolean) => {
      setLineNumbers(next);
      persist({ lineNumbers: next });
    },
    [persist]
  );
  const handleChangeDiffIndicators = useCallback(
    (next: DiffIndicators) => {
      setDiffIndicators(next);
      persist({ diffIndicators: next });
    },
    [persist]
  );
  const handleChangeHunkSeparators = useCallback(
    (next: HunkSeparatorStyle) => {
      setHunkSeparators(next);
      persist({ hunkSeparators: next });
    },
    [persist]
  );
  const handleChangeCollapseMode = useCallback(
    (next: CollapseMode) => {
      setCollapseMode(next);
      session.applyCollapseModeToLoaded(next);
      persist({ collapseMode: next });
    },
    [persist, session.applyCollapseModeToLoaded]
  );
  const handleChangeColorMode = useCallback(
    (next: ColorMode) => {
      setColorMode(next);
      persist({ colorMode: next });
    },
    [persist, setColorMode]
  );
  const handleChangeLightTheme = useCallback(
    (next: LightTheme) => {
      setLightTheme(next);
      persist({ lightTheme: next });
    },
    [persist, setLightTheme]
  );
  const handleChangeDarkTheme = useCallback(
    (next: DarkTheme) => {
      setDarkTheme(next);
      persist({ darkTheme: next });
    },
    [persist, setDarkTheme]
  );

  const handleSelectBranch = useCallback(
    (next: string) => {
      setSelectedBranch(next);
      handleChangeMode("branch");
    },
    [handleChangeMode]
  );
  const handleSelectCommit = useCallback(
    (next: string) => {
      setSelectedCommit(next);
      handleChangeMode("commit");
    },
    [handleChangeMode]
  );

  const handleOpenProject = useCallback(
    (path: string) => {
      project.open(path).catch(() => undefined);
    },
    [project]
  );

  const handleSelectPath = useCallback(
    (itemId: string) => {
      const viewer = session.viewerRef.current;
      if (viewer == null) return;
      const item = viewer.getItem(itemId);
      if (item != null && item.type === "diff" && item.collapsed === true) {
        item.collapsed = false;
        item.version =
          (typeof item.version === "number" ? item.version : 0) + 1;
        viewer.updateItem(item);
      }
      viewer.scrollTo({
        align: "start",
        behavior: "smooth",
        id: itemId,
        type: "item",
      });
    },
    [session.viewerRef]
  );

  const errorBanner = project.error ?? session.error;
  const showViewer =
    project.project != null &&
    (session.loadState === "ready" || session.loadState === "streaming") &&
    session.items.length > 0;

  return (
    <div
      className="grid h-svh grid-rows-[auto_auto_minmax(0,1fr)] text-foreground"
      style={
        chromeStyle ?? {
          backgroundColor: "var(--background)",
          colorScheme: resolvedColorMode,
        }
      }
    >
      <Header
        branches={project.branches}
        chromeStyle={chromeStyle}
        collapseMode={collapseMode}
        colorMode={colorMode}
        commits={project.commits}
        darkTheme={darkTheme}
        diffIndicators={diffIndicators}
        diffStyle={diffStyle}
        hunkSeparators={hunkSeparators}
        lastChangesScope={lastChangesScope}
        lightTheme={lightTheme}
        lineNumbers={lineNumbers}
        mode={mode}
        onChangeCollapseMode={handleChangeCollapseMode}
        onChangeColorMode={handleChangeColorMode}
        onChangeDarkTheme={handleChangeDarkTheme}
        onChangeDiffIndicators={handleChangeDiffIndicators}
        onChangeDiffStyle={handleChangeDiffStyle}
        onChangeHunkSeparators={handleChangeHunkSeparators}
        onChangeLightTheme={handleChangeLightTheme}
        onChangeLineNumbers={handleChangeLineNumbers}
        onChangeMode={handleChangeMode}
        onChangeOverflow={handleChangeOverflow}
        onChangeShowBackgrounds={handleChangeShowBackgrounds}
        onOpenProject={handleOpenProject}
        onReload={session.reload}
        onSelectBranch={handleSelectBranch}
        onSelectCommit={handleSelectCommit}
        overflow={overflow}
        project={project.project}
        recentProjects={project.recentProjects}
        selectedBranch={selectedBranch}
        selectedCommit={selectedCommit}
        showBackgrounds={showBackgrounds}
        worktrees={project.worktrees}
      />
      {errorBanner == null ? (
        <span aria-hidden />
      ) : (
        <div
          className="border-b border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs text-destructive"
          role="alert"
        >
          {errorBanner}
        </div>
      )}
      <div className="grid min-h-0 grid-cols-[288px_minmax(0,1fr)]">
        <Sidebar
          chromeStyle={chromeStyle}
          darkTheme={darkTheme}
          lightTheme={lightTheme}
          loadState={session.loadState}
          onSelectPath={handleSelectPath}
          resolvedColorMode={resolvedColorMode}
          stats={session.stats}
          treeSource={session.treeSource}
        />
        <main aria-label="Diff viewer" className="min-h-0 min-w-0">
          {showViewer ? (
            <CodeViewWrapper
              darkTheme={darkTheme}
              diffIndicators={diffIndicators}
              diffStyle={diffStyle}
              hunkSeparators={hunkSeparators}
              initialItems={session.items}
              lightTheme={lightTheme}
              lineNumbers={lineNumbers}
              onSelectedLinesChange={handleSelectedLinesChange}
              overflow={overflow}
              selectedLines={selectedLines}
              showBackgrounds={showBackgrounds}
              themeType={resolvedColorMode}
              viewerKey={session.viewerKey}
              viewerRef={session.viewerRef}
            />
          ) : (
            <StatusPanel
              errorMessage={session.error}
              onRetry={session.reload}
              state={session.loadState}
            />
          )}
        </main>
      </div>
    </div>
  );
}
