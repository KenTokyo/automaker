import { Link, createFileRoute } from '@tanstack/react-router';

function DeprecatedGraphRoute() {
  return (
    <div className="h-full overflow-y-auto bg-background p-6">
      <div className="mx-auto max-w-2xl rounded-xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-foreground">Graph View ist ausgeblendet</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Diese Ansicht wird aktuell nicht genutzt. Damit die App leichter bleibt, laden wir den
          alten Graph-Bereich nicht mehr als Standard.
        </p>
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
  );
}

export const Route = createFileRoute('/graph')({
  component: DeprecatedGraphRoute,
});
