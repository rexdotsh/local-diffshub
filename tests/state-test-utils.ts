import {
  type AppPreferences,
  appPreferencesSchema,
  type RecentProject,
} from "../src/shared/api";
import type { StateStore } from "../src/server/state/store";

export function createMemoryStateStore(): StateStore & { paths: string[] } {
  const paths: string[] = [];
  const recentProjects: RecentProject[] = [];
  let preferences: AppPreferences = {
    diffStyle: "split",
    overflow: "scroll",
    selectedMode: "combined",
    sidebarCollapsed: false,
  };
  return {
    paths,
    getState() {
      return Promise.resolve({
        preferences,
        recentProjects,
      });
    },
    upsertRecentProject(project) {
      paths.push(project.path);
      recentProjects.unshift({
        ...project,
        lastOpenedAt: new Date().toISOString(),
      });
      preferences = { ...preferences, lastProjectPath: project.path };
      return Promise.resolve({
        preferences,
        recentProjects,
      });
    },
    updatePreferences(nextPreferences) {
      preferences = appPreferencesSchema.parse({
        ...preferences,
        ...nextPreferences,
      });
      return Promise.resolve({
        preferences,
        recentProjects,
      });
    },
  };
}
