import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";

import {
  type AppState,
  appStateSchema,
  type RecentProject,
} from "../../shared/api";

const MAX_RECENT_PROJECTS = 20;

export type StateStore = {
  getState(): Promise<AppState>;
  upsertRecentProject(
    project: Pick<RecentProject, "name" | "path">
  ): Promise<AppState>;
};

export function createStateStore(statePath = resolveStatePath()): StateStore {
  let writeQueue = Promise.resolve();

  return {
    getState() {
      return readState(statePath);
    },
    upsertRecentProject(project) {
      const write = async () => {
        const state = await readState(statePath);
        const nextProject: RecentProject = {
          ...project,
          lastOpenedAt: new Date().toISOString(),
        };
        const recentProjects = [
          nextProject,
          ...state.recentProjects.filter((item) => item.path !== project.path),
        ].slice(0, MAX_RECENT_PROJECTS);
        const nextState: AppState = {
          ...state,
          preferences: {
            ...state.preferences,
            lastProjectPath: project.path,
          },
          recentProjects,
        };
        await writeState(statePath, nextState);
        return nextState;
      };

      const result = writeQueue.then(write, write);
      writeQueue = result.then(
        () => undefined,
        () => undefined
      );
      return result;
    },
  };
}

function resolveStatePath(): string {
  if (process.env.LOCAL_DIFFHUB_STATE_PATH != null) {
    return toAbsolutePath(process.env.LOCAL_DIFFHUB_STATE_PATH);
  }

  const dataHome =
    process.env.XDG_DATA_HOME ?? join(homeDirectory(), ".local", "share");
  return toAbsolutePath(join(dataHome, "local-diffhub", "state.json"));
}

async function readState(path: string): Promise<AppState> {
  try {
    const rawState = await readFile(path, "utf8");
    return appStateSchema.parse(JSON.parse(rawState));
  } catch (error) {
    if (isMissingFileError(error)) {
      return appStateSchema.parse({});
    }
    throw error;
  }
}

async function writeState(path: string, state: AppState): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = join(
    dirname(path),
    `.${basename(path)}.${process.pid}.${randomUUID()}.tmp`
  );
  await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, {
    mode: 0o600,
  });
  await rename(temporaryPath, path);
}

function toAbsolutePath(path: string): string {
  return isAbsolute(path) ? path : resolve(process.cwd(), path);
}

function isMissingFileError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}

function homeDirectory(): string {
  return process.env.HOME ?? process.cwd();
}
