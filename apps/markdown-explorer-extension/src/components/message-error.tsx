import { AlertTriangle } from 'lucide-react';

interface MessageErrorProps {
  message: string;
  timestamp: string;
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '--:--';
  }
  return date.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function MessageError({ message, timestamp }: MessageErrorProps) {
  return (
    <div className="max-w-4xl rounded-xl border border-red-400/50 bg-red-500/10 px-3 py-2">
      <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-300">
        <AlertTriangle className="h-4 w-4" />
        Es gab einen Fehler
      </div>
      <p className="whitespace-pre-wrap text-sm text-red-700 dark:text-red-200">{message}</p>
      <p className="mt-2 text-[11px] text-red-700/75 dark:text-red-300/80">
        Zeit: {formatTimestamp(timestamp)}
      </p>
    </div>
  );
}
