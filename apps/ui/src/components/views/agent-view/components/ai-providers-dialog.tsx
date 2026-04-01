import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AnthropicIcon,
  CursorIcon,
  OpenAIIcon,
  OpenCodeIcon,
  GeminiIcon,
  CopilotIcon,
} from '@/components/ui/provider-icon';
import { ClaudeSettingsTab } from '@/components/views/settings-view/providers/claude-settings-tab';
import { CursorSettingsTab } from '@/components/views/settings-view/providers/cursor-settings-tab';
import { CodexSettingsTab } from '@/components/views/settings-view/providers/codex-settings-tab';
import { OpencodeSettingsTab } from '@/components/views/settings-view/providers/opencode-settings-tab';
import { GeminiSettingsTab } from '@/components/views/settings-view/providers/gemini-settings-tab';
import { CopilotSettingsTab } from '@/components/views/settings-view/providers/copilot-settings-tab';
import { Bot } from 'lucide-react';

type ProviderTabId = 'claude' | 'cursor' | 'codex' | 'opencode' | 'gemini' | 'copilot';

interface AiProvidersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: ProviderTabId;
}

const PROVIDER_TABS: {
  id: ProviderTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'claude', label: 'Claude', icon: AnthropicIcon },
  { id: 'cursor', label: 'Cursor', icon: CursorIcon },
  { id: 'codex', label: 'Codex', icon: OpenAIIcon },
  { id: 'opencode', label: 'OpenCode', icon: OpenCodeIcon },
  { id: 'gemini', label: 'Gemini', icon: GeminiIcon },
  { id: 'copilot', label: 'Copilot', icon: CopilotIcon },
];

export function AiProvidersDialog({
  open,
  onOpenChange,
  defaultTab = 'claude',
}: AiProvidersDialogProps) {
  const [activeTab, setActiveTab] = useState<ProviderTabId>(defaultTab);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2.5">
            <Bot className="w-5 h-5 text-primary" />
            AI Providers
          </DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as ProviderTabId)}
          className="flex-1 overflow-hidden flex flex-col min-h-0"
        >
          <TabsList className="grid w-full grid-cols-6 shrink-0">
            {PROVIDER_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center gap-1.5 text-xs sm:text-sm"
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4 pr-1 scrollbar-styled">
            <TabsContent value="claude" className="mt-0">
              <ClaudeSettingsTab />
            </TabsContent>
            <TabsContent value="cursor" className="mt-0">
              <CursorSettingsTab />
            </TabsContent>
            <TabsContent value="codex" className="mt-0">
              <CodexSettingsTab />
            </TabsContent>
            <TabsContent value="opencode" className="mt-0">
              <OpencodeSettingsTab />
            </TabsContent>
            <TabsContent value="gemini" className="mt-0">
              <GeminiSettingsTab />
            </TabsContent>
            <TabsContent value="copilot" className="mt-0">
              <CopilotSettingsTab />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
