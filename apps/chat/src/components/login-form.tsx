import { useState } from 'react';
import { login } from '@/lib/http-api-client';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { KeyRound, AlertCircle } from 'lucide-react';

/**
 * Simplified login form for the standalone chat app.
 *
 * Unlike the full LoginView which handles server checking and setup
 * redirects via TanStack Router, this component only handles the
 * API key submission. Server readiness and settings hydration are
 * managed by AppContent in app.tsx.
 */
export function LoginForm() {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const setAuthState = useAuthStore((s) => s.setAuthState);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim() || isLoggingIn) return;

    setIsLoggingIn(true);
    setError(null);

    try {
      const result = await login(apiKey.trim());

      if (result.success) {
        setAuthState({ isAuthenticated: true, authChecked: true });
      } else {
        setError(result.error || 'Invalid API key');
        setIsLoggingIn(false);
      }
    } catch {
      setError('Failed to connect to server');
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <KeyRound className="h-8 w-8 text-primary" />
          </div>
          <h1 className="mt-6 text-2xl font-bold tracking-tight">UniAI Chat</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter the API key shown in the server console to continue.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="apiKey" className="text-sm font-medium">
              API Key
            </label>
            <Input
              id="apiKey"
              type="password"
              placeholder="Enter API key..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={isLoggingIn}
              autoFocus
              className="font-mono"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoggingIn || !apiKey.trim()}>
            {isLoggingIn ? (
              <>
                <Spinner size="sm" variant="foreground" className="mr-2" />
                Authenticating...
              </>
            ) : (
              'Login'
            )}
          </Button>
        </form>

        {/* Help Text */}
        <div className="rounded-lg border bg-muted/50 p-4 text-sm">
          <p className="font-medium">Where to find the API key:</p>
          <ol className="mt-2 list-inside list-decimal space-y-1 text-muted-foreground">
            <li>Look at the server terminal/console output</li>
            <li>Find the box labeled &quot;API Key for Web Mode Authentication&quot;</li>
            <li>Copy the UUID displayed there</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
