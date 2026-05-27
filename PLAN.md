# Local Diffhub Plan

Build a read-only local Git review daemon in `/home/majdoor/diffs` using Bun, Hono, Vite React, shadcn/ui, and Pierre diff primitives.

## Decisions

- Single package app, not a monorepo.
- Read-only Git operations only; no checkout, staging, worktree creation, branch writes, or patch application.
- Basic HTTP auth for non-localhost access. Localhost is allowed without credentials when auth env vars are unset.
- Project paths are unrestricted, but every opened path must resolve to a Git repository.
- Branch review defaults to `default...branch` PR-style diffs.
- Worktrees expose branch, staged, unstaged, combined, and full-review diff modes.
- Remote branches are included and collapsed by default.
- Main branch detection uses `origin/HEAD`, then `main`, then `master`, then current branch.
- Recent projects and preferences persist to `~/.local/share/local-diffhub/state.json`.
- Hot reload uses server-sent events and debounced refreshes.

## Phases

- [x] Phase 0: Scaffold Bun/Vite/Hono/shadcn foundation and copy Kleis-style tooling.
- [x] Phase 1: Server foundation with auth, JSON state, API error contracts, and static/dev serving.
- [ ] Phase 2: Read-only Git command wrapper, repo open/validation, and default-branch detection.
- [ ] Phase 3: Branch, remote, worktree, and status APIs with tests.
- [ ] Phase 4: Diff mode planning, read-only diff command generation, streaming endpoints, and output limits.
- [ ] Phase 5: Hot reload SSE watcher lifecycle and debounced client invalidation.
- [ ] Phase 6: shadcn React shell for project opener, sidebar navigation, and review mode selection.
- [ ] Phase 7: Pierre diff viewer parser integration, file tree, controls, and large-diff edge cases.
- [ ] Phase 8: Final verification, simplification pass, and documentation.

## Review Loop

After each implementation phase:

- Run typecheck/lint/build/tests as applicable.
- Launch parallel review agents focused on bugs, security, UX, server simplification, client simplification, and duplication.
- Apply useful fixes before marking the phase complete.
- Update this plan checkbox and commit with a conventional commit message.
