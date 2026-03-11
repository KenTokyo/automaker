import { useState, useEffect, useRef, useDeferredValue } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createLogger } from '@automaker/utils/logger';
import { useAppStore, getStoredTheme, type ThemeMode } from '@/store/app-store';
import { useAuthStore } from '@/store/auth-store';
import { useSetupStore } from '@/store/setup-store';
import { initializeProject } from '@/lib/project-init';
import type { Project } from '@/lib/electron';
import {
  initApiKey,
  checkAuthStatus,
  getServerUrlSync,
  getHttpApiClient,
} from '@/lib/http-api-client';
import {
  hydrateStoreFromSettings,
  signalMigrationComplete,
  performSettingsMigration,
} from '@/hooks/use-settings-migration';
import { queryClient } from '@/lib/query-client';
import { useSettingsSync } from '@/hooks/use-settings-sync';
import { useProjectSettingsLoader } from '@/hooks/use-project-settings-loader';
import { themeOptions } from '@/config/theme-options';
import { LoadingState } from '@/components/ui/loading-state';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from 'sonner';
import { LoginForm } from './components/login-form';
import { ChatLayout } from './chat-layout';
import { useSessionStore } from './stores/session-store';
import { useSessionHydration } from './hooks/use-session-hydration';
import './index.css';
// Import theme and font CSS from shared UI
import '@/styles/theme-imports';
import '@/styles/font-imports';

const logger = createLogger('ChatApp');

const SERVER_READY_MAX_ATTEMPTS = 40;
const SERVER_READY_BACKOFF_BASE_MS = 500;
const SERVER_READY_MAX_DELAY_MS = 2000;
const SERVER_READY_TIMEOUT_MS = 2000;
const SERVER_RETRY_INTERVAL_MS = 3000;
const NO_STORE_CACHE_MODE: RequestCache = 'no-store';

// Apply stored theme immediately (before React hydration)
function applyStoredTheme(): void {
  const storedTheme = getStoredTheme();
  if (storedTheme) {
    const root = document.documentElement;
    const themeClasses = themeOptions.map((option) => option.value);
    root.classList.remove(...themeClasses);

    if (storedTheme === 'dark') {
      root.classList.add('dark');
    } else if (storedTheme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.add(isDark ? 'dark' : 'light');
    } else if (storedTheme !== 'light') {
      root.classList.add(storedTheme);
    } else {
      root.classList.add('light');
    }
  }
}

applyStoredTheme();

async function waitForServerReady(): Promise<boolean> {
  const serverUrl = getServerUrlSync();

  for (let attempt = 1; attempt <= SERVER_READY_MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(`${serverUrl}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(SERVER_READY_TIMEOUT_MS),
        cache: NO_STORE_CACHE_MODE,
      });

      if (response.ok) {
        return true;
      }
    } catch (error) {
      logger.warn(`Server readiness check failed (attempt ${attempt})`, error);
    }

    const delayMs = Math.min(SERVER_READY_MAX_DELAY_MS, SERVER_READY_BACKOFF_BASE_MS * attempt);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return false;
}

// ─── Auto-open project helpers ──────────────────────────────────────────────

function getProjectLastOpenedMs(project: Project): number {
  if (!project.lastOpened) return 0;
  const parsed = Date.parse(project.lastOpened);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function selectAutoOpenProject(
  currentProject: Project | null,
  projects: Project[],
  projectHistory: string[]
): Project | null {
  if (currentProject) return currentProject;

  // Try history first
  if (projectHistory.length > 0) {
    const historyProject = projects.find((p) => p.id === projectHistory[0]);
    if (historyProject) return historyProject;
  }

  // Single project → auto-select
  if (projects.length === 1) return projects[0] ?? null;

  // Multiple projects → most recently opened
  if (projects.length > 1) {
    let latest: Project | null = projects[0] ?? null;
    let latestTs = latest ? getProjectLastOpenedMs(latest) : 0;
    for (const project of projects) {
      const ts = getProjectLastOpenedMs(project);
      if (ts > latestTs) {
        latestTs = ts;
        latest = project;
      }
    }
    return latest;
  }

  return null;
}

// ─── Inner App Content (has access to stores) ──────────────────────────────

function AppContent() {
  const setSessionProjectContext = useSessionStore((state) => state.setProjectContext);
  const sessionsHydrated = useSessionHydration();
  const authChecked = useAuthStore((s) => s.authChecked);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const settingsLoaded = useAuthStore((s) => s.settingsLoaded);
  const { setupComplete } = useSetupStore();

  const {
    currentProject,
    projects,
    projectHistory,
    upsertAndSetCurrentProject,
    getEffectiveTheme,
    getEffectiveFontSans,
    getEffectiveFontMono,
    theme,
    fontFamilySans,
    fontFamilyMono,
  } = useAppStore();

  const [autoOpenDone, setAutoOpenDone] = useState(false);
  const [serverOffline, setServerOffline] = useState(false);

  // Subscribe to trigger re-renders
  void theme;
  void fontFamilySans;
  void fontFamilyMono;

  const effectiveTheme = getEffectiveTheme();
  const deferredTheme = useDeferredValue(effectiveTheme);
  const effectiveFontSans = getEffectiveFontSans();
  const effectiveFontMono = getEffectiveFontMono();

  const authCheckRunning = useRef(false);

  // Sync settings to server
  const settingsSyncState = useSettingsSync();
  if (settingsSyncState.error) {
    logger.error('Settings sync error:', settingsSyncState.error);
  }

  // Load project-specific settings when project changes
  useProjectSettingsLoader();

  useEffect(() => {
    if (!currentProject?.path) return;
    setSessionProjectContext(currentProject.path, currentProject.path);
  }, [currentProject?.path, setSessionProjectContext]);

  // ─── Auth initialization ─────────────────────────────────────────────

  useEffect(() => {
    if (authCheckRunning.current || serverOffline) return;

    const initAuth = async () => {
      authCheckRunning.current = true;

      try {
        await initApiKey();

        const serverReady = await waitForServerReady();
        if (!serverReady) {
          logger.warn('Server not reachable after initial retries, entering offline retry mode');
          setServerOffline(true);
          return;
        }

        let isValid = false;
        try {
          const authStatus = await checkAuthStatus();
          isValid = authStatus.authenticated;
        } catch (error) {
          logger.warn('Auth status check failed:', error);
          isValid = false;
        }

        if (isValid) {
          const api = getHttpApiClient();
          try {
            const maxAttempts = 8;
            const baseDelayMs = 250;
            let lastError: unknown = null;

            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
              try {
                const settingsResult = await api.settings.getGlobal();
                if (settingsResult.success && settingsResult.settings) {
                  const { settings: finalSettings, migrated } = await performSettingsMigration(
                    settingsResult.settings as unknown as Parameters<
                      typeof performSettingsMigration
                    >[0]
                  );

                  if (migrated) {
                    logger.info('Settings migration from localStorage completed');
                  }

                  hydrateStoreFromSettings(finalSettings);
                  await new Promise((resolve) => setTimeout(resolve, 0));
                  signalMigrationComplete();

                  useAuthStore.getState().setAuthState({
                    isAuthenticated: true,
                    authChecked: true,
                    settingsLoaded: true,
                  });

                  return;
                }

                lastError = settingsResult;
              } catch (error) {
                lastError = error;
              }

              const delayMs = Math.min(1500, baseDelayMs * attempt);
              logger.warn(
                `Settings not ready (attempt ${attempt}/${maxAttempts}); retrying in ${delayMs}ms...`,
                lastError
              );
              await new Promise((resolve) => setTimeout(resolve, delayMs));
            }

            throw lastError ?? new Error('Failed to load settings');
          } catch (error) {
            logger.error('Failed to fetch settings after valid session:', error);
            useAuthStore.getState().setAuthState({ isAuthenticated: false, authChecked: true });
            signalMigrationComplete();
          }
        } else {
          useAuthStore.getState().setAuthState({ isAuthenticated: false, authChecked: true });
          signalMigrationComplete();
        }
      } catch (error) {
        logger.error('Failed to initialize auth:', error);
        useAuthStore.getState().setAuthState({ isAuthenticated: false, authChecked: true });
        signalMigrationComplete();
      } finally {
        authCheckRunning.current = false;
      }
    };

    initAuth();
    // Re-run when serverOffline flips back to false (server came online)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverOffline]);

  // ─── Background retry when server is offline ────────────────────────

  useEffect(() => {
    if (!serverOffline) return;

    const retryInterval = setInterval(async () => {
      const serverUrl = getServerUrlSync();
      try {
        const response = await fetch(`${serverUrl}/api/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(SERVER_READY_TIMEOUT_MS),
          cache: 'no-store' as RequestCache,
        });

        if (response.ok) {
          logger.info('Server came online, running auth check...');
          clearInterval(retryInterval);
          setServerOffline(false);
          // Reset auth ref so the auth init effect can run again
          authCheckRunning.current = false;
        }
      } catch {
        // Still offline, keep trying
      }
    }, SERVER_RETRY_INTERVAL_MS);

    return () => clearInterval(retryInterval);
  }, [serverOffline]);

  // ─── Fallback settings load ──────────────────────────────────────────

  useEffect(() => {
    if (!authChecked || !isAuthenticated || settingsLoaded) return;

    logger.info('Auth valid but settings not loaded - triggering fallback load');

    const loadSettings = async () => {
      const api = getHttpApiClient();
      try {
        const settingsResult = await api.settings.getGlobal();
        if (settingsResult.success && settingsResult.settings) {
          const { settings: finalSettings } = await performSettingsMigration(
            settingsResult.settings as unknown as Parameters<typeof performSettingsMigration>[0]
          );
          hydrateStoreFromSettings(finalSettings);
          await new Promise((resolve) => setTimeout(resolve, 0));
          signalMigrationComplete();
          useAuthStore.getState().setAuthState({ settingsLoaded: true });
        }
      } catch (error) {
        logger.error('Failed to load settings in fallback:', error);
      }
    };

    loadSettings();
  }, [authChecked, isAuthenticated, settingsLoaded]);

  // ─── Event listeners for auth/server errors ──────────────────────────

  useEffect(() => {
    const handleLoggedOut = () => {
      logger.warn('automaker:logged-out event received');
      useAuthStore.getState().setAuthState({ isAuthenticated: false, authChecked: true });
    };

    const handleOffline = () => {
      logger.warn('automaker:server-offline event received');
      setServerOffline(true);
    };

    window.addEventListener('automaker:logged-out', handleLoggedOut);
    window.addEventListener('automaker:server-offline', handleOffline);
    return () => {
      window.removeEventListener('automaker:logged-out', handleLoggedOut);
      window.removeEventListener('automaker:server-offline', handleOffline);
    };
  }, []);

  // ─── Theme application ───────────────────────────────────────────────

  useEffect(() => {
    const root = document.documentElement;
    const themeClasses = themeOptions
      .map((option) => option.value)
      .filter((t) => t !== ('system' as string));
    root.classList.remove(...themeClasses);

    if (deferredTheme === 'dark') {
      root.classList.add('dark');
    } else if (deferredTheme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.add(isDark ? 'dark' : 'light');
    } else if (deferredTheme && deferredTheme !== 'light') {
      root.classList.add(deferredTheme);
    } else {
      root.classList.add('light');
    }
  }, [deferredTheme]);

  // ─── Font CSS variables ──────────────────────────────────────────────

  useEffect(() => {
    const root = document.documentElement;

    if (effectiveFontSans) {
      root.style.setProperty('--font-sans', effectiveFontSans);
    } else {
      root.style.removeProperty('--font-sans');
    }

    if (effectiveFontMono) {
      root.style.setProperty('--font-mono', effectiveFontMono);
    } else {
      root.style.removeProperty('--font-mono');
    }
  }, [effectiveFontSans, effectiveFontMono]);

  // ─── Auto-open project on startup ───────────────────────────────────

  useEffect(() => {
    if (!settingsLoaded || !isAuthenticated || autoOpenDone) return;

    const candidate = selectAutoOpenProject(currentProject, projects, projectHistory);
    if (!candidate) {
      setAutoOpenDone(true);
      return;
    }

    // Already set as current
    if (currentProject?.id === candidate.id) {
      setAutoOpenDone(true);
      return;
    }

    const openProject = async () => {
      try {
        const result = await initializeProject(candidate.path);
        if (!result.success) {
          logger.warn('Auto-open project failed:', result.error);
        }
        upsertAndSetCurrentProject(
          candidate.path,
          candidate.name,
          candidate.theme as ThemeMode | undefined
        );
      } catch (error) {
        logger.error('Auto-open project crashed:', error);
      } finally {
        setAutoOpenDone(true);
      }
    };

    openProject();
  }, [
    settingsLoaded,
    isAuthenticated,
    autoOpenDone,
    currentProject,
    projects,
    projectHistory,
    upsertAndSetCurrentProject,
  ]);

  // ─── Conditional rendering (replaces TanStack Router) ────────────────

  // Server offline - show connecting spinner with auto-retry
  if (serverOffline) {
    return (
      <main className="flex h-screen items-center justify-center" data-testid="chat-app">
        <LoadingState message="Verbinde mit Server..." />
      </main>
    );
  }

  // Loading state - auth not yet checked
  if (!authChecked) {
    return (
      <main className="flex h-screen items-center justify-center" data-testid="chat-app">
        <LoadingState message="Loading..." />
      </main>
    );
  }

  // Not authenticated - show login form
  if (!isAuthenticated) {
    return (
      <main className="h-screen overflow-hidden" data-testid="chat-app">
        <LoginForm />
      </main>
    );
  }

  // Authenticated but settings not loaded yet
  if (!settingsLoaded) {
    return (
      <main className="flex h-screen items-center justify-center" data-testid="chat-app">
        <LoadingState message="Loading settings..." />
      </main>
    );
  }

  if (!sessionsHydrated) {
    return (
      <main className="flex h-screen items-center justify-center" data-testid="chat-app">
        <LoadingState message="Chats werden geladen..." />
      </main>
    );
  }

  // Auto-opening project
  if (!autoOpenDone && projects.length > 0) {
    return (
      <main className="flex h-screen items-center justify-center" data-testid="chat-app">
        <LoadingState message="Opening project..." />
      </main>
    );
  }

  // Authenticated + settings loaded → show chat
  // If setup not complete (no API key), ChatLayout will auto-open settings panel
  return (
    <main className="flex h-screen overflow-hidden" data-testid="chat-app">
      <ChatLayout autoOpenSettings={!setupComplete} />
      <Toaster richColors position="bottom-right" />
    </main>
  );
}

// ─── Root App with Providers ─────────────────────────────────────────────────

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
