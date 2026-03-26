import { Link, createFileRoute } from '@tanstack/react-router';

function DeprecatedBoardRoute() {
  return (
    <div className="h-full overflow-y-auto bg-background p-6">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-foreground">Kanban Board ist veraltet</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Dieses alte Board wird nicht mehr aktiv genutzt. Für Aufgaben nutzen wir jetzt das neue
            Public-Kanban.
          </p>

          <div className="mt-4 rounded-lg border border-border bg-muted p-3">
            <p className="text-xs font-medium text-foreground">Neues Kanban</p>
            <a
              href="https://automaker-kanban.vercel.app/"
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex text-sm text-brand-500 hover:text-brand-400 hover:underline"
            >
              https://automaker-kanban.vercel.app/
            </a>
            <p className="mt-2 text-xs text-muted-foreground">
              Code liegt in <code>apps/kanban-web</code>.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              to="/agent"
              className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-500"
            >
              Zum Agent Runner
            </Link>
            <Link
              to="/project-overview"
              className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              Zur Übersicht
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/board')({
  component: DeprecatedBoardRoute,
});
