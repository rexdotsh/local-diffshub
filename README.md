# Local Diffshub

Local Diffshub is a read-only Git review app for inspecting local repositories in the browser. The browser tab title is `diffs`.

It combines a Bun/Hono API with a Vite React frontend and Pierre diff/file-tree components.

## Features

- Open local Git repositories and worktrees.
- Review branch, commit, staged, unstaged, and combined diffs.
- Browse changed files with a keyboard-friendly file tree.
- Persist recent projects and UI preferences locally.
- Refresh automatically when watched project files change.
- Run read-only Git commands only.

## Development

Install dependencies:

```sh
bun install
```

Run the API and web app in separate terminals:

```sh
bun run dev:api
bun run dev
```

- Web: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:3003`
- Optional API override: `VITE_API_ORIGIN=http://127.0.0.1:3003`

## Production

Build both client and server bundles:

```sh
bun run build
```

Start the bundled server:

```sh
bun run start
```

## Docker

Run the production server on local loopback:

```sh
docker compose up --build
```

- App: `http://127.0.0.1:3003`
- State volume: `diffshub-state`
- Mounted repo path inside the container: `/repos/diffs`
- Add more read-only bind mounts under `/repos` to browse other local repositories.

## Verification

```sh
bun run typecheck
bun run lint
bun test
```

## Configuration

Localhost can run without authentication. For non-local access, set both auth variables:

```sh
LOCAL_DIFFSHUB_USER=...
LOCAL_DIFFSHUB_PASSWORD=...
```

State is stored at `~/.local/share/local-diffshub/state.json` by default. Override it with:

```sh
LOCAL_DIFFSHUB_STATE_PATH=/path/to/state.json
```

## Safety Limits

- Diff streams are capped at 50 MiB and 60 seconds per request.
- JSON API bodies are capped at 64 KiB.
- Git command output is capped to avoid unbounded memory use.
- File watching ignores `.git`, `node_modules`, and `dist`.
