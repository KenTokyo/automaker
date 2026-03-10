import { useState, useEffect, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/app-store';
import {
  Key,
  Bot,
  Workflow,
  Palette,
  Bell,
  Plug,
  MessageSquareText,
  User,
  FolderCog,
} from 'lucide-react';
import {
  AnthropicIcon,
  CursorIcon,
  OpenAIIcon,
  OpenCodeIcon,
  GeminiIcon,
  CopilotIcon,
} from '@/components/ui/provider-icon';
import type { LucideIcon } from 'lucide-react';
import type { ModelProvider } from '@automaker/types';

// Settings sections (reused from main app)
import { ApiKeysSection } from '@/components/views/settings-view/api-keys/api-keys-section';
import { ModelDefaultsSection } from '@/components/views/settings-view/model-defaults';
import { AppearanceSection } from '@/components/views/settings-view/appearance/appearance-section';
import { AudioSection } from '@/components/views/settings-view/audio/audio-section';
import { AccountSection } from '@/components/views/settings-view/account';
import {
  ClaudeSettingsTab,
  CursorSettingsTab,
  CodexSettingsTab,
  OpencodeSettingsTab,
  GeminiSettingsTab,
  CopilotSettingsTab,
} from '@/components/views/settings-view/providers';
import { MCPServersSection } from '@/components/views/settings-view/mcp-servers';
import { PromptCustomizationSection } from '@/components/views/settings-view/prompts';
import { ProjectIdentitySection } from '@/components/views/project-settings-view/project-identity-section';
import { ProjectThemeSection } from '@/components/views/project-settings-view/project-theme-section';
import { ProjectModelsSection } from '@/components/views/project-settings-view/project-models-section';
import type { Theme } from '@/components/views/settings-view/shared/types';

// ─── Types ───────────────────────────────────────────────────────────────────

type ChatSettingsViewId =
  | 'project'
  | 'api-keys'
  | 'model-defaults'
  | 'providers'
  | 'claude-provider'
  | 'cursor-provider'
  | 'codex-provider'
  | 'opencode-provider'
  | 'gemini-provider'
  | 'copilot-provider'
  | 'mcp-servers'
  | 'prompts'
  | 'appearance'
  | 'audio'
  | 'account';

interface NavItem {
  id: ChatSettingsViewId;
  label: string;
  icon: LucideIcon | React.ComponentType<{ className?: string }>;
  subItems?: NavItem[];
}

const NAV_ID_TO_PROVIDER: Record<string, ModelProvider> = {
  'claude-provider': 'claude',
  'cursor-provider': 'cursor',
  'codex-provider': 'codex',
  'opencode-provider': 'opencode',
  'gemini-provider': 'gemini',
  'copilot-provider': 'copilot',
};

// ─── Navigation Config ──────────────────────────────────────────────────────

const CHAT_NAV_ITEMS: NavItem[] = [
  { id: 'project', label: 'Project', icon: FolderCog },
  { id: 'api-keys', label: 'API Keys', icon: Key },
  { id: 'model-defaults', label: 'Model Defaults', icon: Workflow },
  {
    id: 'providers',
    label: 'AI Providers',
    icon: Bot,
    subItems: [
      { id: 'claude-provider', label: 'Claude', icon: AnthropicIcon },
      { id: 'cursor-provider', label: 'Cursor', icon: CursorIcon },
      { id: 'codex-provider', label: 'Codex', icon: OpenAIIcon },
      { id: 'opencode-provider', label: 'OpenCode', icon: OpenCodeIcon },
      { id: 'gemini-provider', label: 'Gemini', icon: GeminiIcon },
      { id: 'copilot-provider', label: 'Copilot', icon: CopilotIcon },
    ],
  },
  { id: 'mcp-servers', label: 'MCP Servers', icon: Plug },
  { id: 'prompts', label: 'Prompts', icon: MessageSquareText },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'audio', label: 'Notifications', icon: Bell },
  { id: 'account', label: 'Account', icon: User },
];

// ─── Settings Panel Component ───────────────────────────────────────────────

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialView?: ChatSettingsViewId;
}

export function SettingsPanel({ open, onOpenChange, initialView }: SettingsPanelProps) {
  const [activeView, setActiveView] = useState<ChatSettingsViewId>(initialView ?? 'api-keys');
  const [providersOpen, setProvidersOpen] = useState(true);

  // Reset view when panel opens with an initialView
  useEffect(() => {
    if (open && initialView) {
      setActiveView(initialView);
    }
  }, [open, initialView]);

  const handleNavigate = useCallback((viewId: ChatSettingsViewId) => {
    if (viewId === 'providers') {
      setProvidersOpen((prev) => !prev);
      return;
    }
    setActiveView(viewId);
  }, []);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-none sm:w-[680px] lg:w-[780px] p-0 flex flex-col"
      >
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle className="text-base">Settings</SheetTitle>
          <SheetDescription className="text-xs">Configure your chat experience</SheetDescription>
        </SheetHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Navigation */}
          <SettingsPanelNav
            items={CHAT_NAV_ITEMS}
            activeView={activeView}
            providersOpen={providersOpen}
            onNavigate={handleNavigate}
          />

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-6">
            <div className="max-w-2xl">
              <SettingsPanelContent activeView={activeView} />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Navigation ─────────────────────────────────────────────────────────────

function SettingsPanelNav({
  items,
  activeView,
  providersOpen,
  onNavigate,
}: {
  items: NavItem[];
  activeView: ChatSettingsViewId;
  providersOpen: boolean;
  onNavigate: (id: ChatSettingsViewId) => void;
}) {
  const disabledProviders = useAppStore((s) => s.disabledProviders);
  const currentProject = useAppStore((s) => s.currentProject);

  return (
    <nav className="w-44 shrink-0 overflow-y-auto border-r border-border/50 bg-card/40 p-2 space-y-0.5 hidden sm:block">
      {items.map((item) => {
        // Hide project section when no project is selected
        if (item.id === 'project' && !currentProject) return null;

        if (item.subItems) {
          const hasActiveChild = item.subItems.some((sub) => sub.id === activeView);
          const Icon = item.icon;
          return (
            <div key={item.id}>
              <button
                onClick={() => onNavigate(item.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors',
                  'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                  hasActiveChild && 'text-foreground'
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate flex-1 text-left">{item.label}</span>
                <svg
                  className={cn(
                    'w-3 h-3 shrink-0 transition-transform',
                    providersOpen && 'rotate-90'
                  )}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              {providersOpen && (
                <div className="ml-3 mt-0.5 space-y-0.5">
                  {item.subItems.map((sub) => {
                    const SubIcon = sub.icon;
                    const isActive = sub.id === activeView;
                    const provider = NAV_ID_TO_PROVIDER[sub.id];
                    const isDisabled = provider && disabledProviders.includes(provider);
                    return (
                      <button
                        key={sub.id}
                        onClick={() => onNavigate(sub.id)}
                        className={cn(
                          'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors',
                          isActive
                            ? 'bg-brand-500/10 text-foreground border border-brand-500/20'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                          isDisabled && !isActive && 'opacity-40'
                        )}
                      >
                        <SubIcon
                          className={cn('w-3.5 h-3.5 shrink-0', isActive && 'text-brand-500')}
                        />
                        <span className="truncate">{sub.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        const Icon = item.icon;
        const isActive = item.id === activeView;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={cn(
              'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors',
              isActive
                ? 'bg-brand-500/10 text-foreground border border-brand-500/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            )}
          >
            <Icon className={cn('w-3.5 h-3.5 shrink-0', isActive && 'text-brand-500')} />
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// ─── Content Renderer ───────────────────────────────────────────────────────

function SettingsPanelContent({ activeView }: { activeView: ChatSettingsViewId }) {
  const {
    theme,
    setTheme,
    muteDoneSound,
    setMuteDoneSound,
    notificationSoundVolume,
    setNotificationSoundVolume,
    notificationSoundFile,
    setNotificationSoundFile,
    allPhasesCompleteSoundFile,
    setAllPhasesCompleteSoundFile,
    currentProject,
    promptCustomization,
    setPromptCustomization,
  } = useAppStore();

  const globalTheme = theme as Theme;

  switch (activeView) {
    case 'project':
      if (!currentProject) return <NoProjectMessage />;
      return (
        <div className="space-y-8">
          <ProjectIdentitySection project={currentProject} />
          <ProjectThemeSection project={currentProject} />
          <ProjectModelsSection project={currentProject} />
        </div>
      );

    case 'api-keys':
      return <ApiKeysSection />;

    case 'model-defaults':
      return <ModelDefaultsSection />;

    case 'claude-provider':
      return <ClaudeSettingsTab />;
    case 'cursor-provider':
      return <CursorSettingsTab />;
    case 'codex-provider':
      return <CodexSettingsTab />;
    case 'opencode-provider':
      return <OpencodeSettingsTab />;
    case 'gemini-provider':
      return <GeminiSettingsTab />;
    case 'copilot-provider':
      return <CopilotSettingsTab />;
    case 'providers':
      return <ClaudeSettingsTab />;

    case 'mcp-servers':
      return <MCPServersSection />;

    case 'prompts':
      return (
        <PromptCustomizationSection
          promptCustomization={promptCustomization}
          onPromptCustomizationChange={setPromptCustomization}
        />
      );

    case 'appearance':
      return (
        <AppearanceSection
          effectiveTheme={globalTheme}
          onThemeChange={(newTheme) => setTheme(newTheme as typeof theme)}
        />
      );

    case 'audio':
      return (
        <AudioSection
          muteDoneSound={muteDoneSound}
          notificationSoundVolume={notificationSoundVolume}
          notificationSoundFile={notificationSoundFile}
          allPhasesCompleteSoundFile={allPhasesCompleteSoundFile}
          projectPath={currentProject?.path ?? null}
          onMuteDoneSoundChange={setMuteDoneSound}
          onNotificationSoundVolumeChange={setNotificationSoundVolume}
          onNotificationSoundFileChange={setNotificationSoundFile}
          onAllPhasesCompleteSoundFileChange={setAllPhasesCompleteSoundFile}
        />
      );

    case 'account':
      return <AccountSection />;

    default:
      return <ApiKeysSection />;
  }
}

function NoProjectMessage() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <FolderCog className="w-10 h-10 text-muted-foreground/40 mb-3" />
      <p className="text-sm text-muted-foreground">No project selected</p>
      <p className="text-xs text-muted-foreground/70 mt-1">
        Select a project first to configure project-specific settings.
      </p>
    </div>
  );
}
