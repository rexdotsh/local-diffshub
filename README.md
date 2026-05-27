# Local Diffhub

Read-only local Git review service built with Bun, Hono, Vite React, shadcn/ui, and Pierre diff primitives.

See `PLAN.md` for the implementation phases and architectural decisions.

## Run

```sh
bun install
bun run dev
```

- Web: `http://127.0.0.1:5173`
- API/server: `http://127.0.0.1:3003`

## Build And Verify

```sh
bun run typecheck
bun run lint
bun test
bun run build
```

## Auth

Localhost can run without auth. For non-local access set both:

```sh
LOCAL_DIFFHUB_USER=...
LOCAL_DIFFHUB_PASSWORD=...
```

The app only runs read-only Git commands. It never checks out branches, stages files, applies patches, or mutates worktrees.
