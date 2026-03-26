import { Link, createFileRoute } from '@tanstack/react-router';

function RemovedSpecRoute() {
  return (
    <div className="h-full overflow-y-auto bg-background p-6">
      <div className="mx-auto max-w-2xl rounded-xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-foreground">Spec Editor ist entfernt</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Der Spec Editor wird momentan nicht genutzt und ist deshalb aus der normalen Navigation
          rausgenommen.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            to="/context"
            className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-500"
          >
            Zu Context
          </Link>
          <Link
            to="/memory"
            className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
          >
            Zu Memory
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/spec')({
  component: RemovedSpecRoute,
});
