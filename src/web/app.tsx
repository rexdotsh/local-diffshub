export function App() {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <section className="mx-auto flex min-h-svh max-w-5xl flex-col items-start justify-center gap-6 px-6">
        <p className="rounded-full border border-border px-3 py-1 text-muted-foreground text-sm">
          Local Diffhub
        </p>
        <div className="space-y-4">
          <h1 className="max-w-3xl text-balance font-semibold text-5xl tracking-tight">
            Review local Git branches and worktrees from your browser.
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Bun, Hono, Vite, shadcn/ui, and Pierre diff primitives are being
            wired together here.
          </p>
        </div>
      </section>
    </main>
  );
}
