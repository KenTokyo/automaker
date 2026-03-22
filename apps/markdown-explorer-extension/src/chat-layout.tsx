import { useAppStore } from '@/store/app-store';
import { ChatNoProjectState } from './components/chat-no-project-state';
import { MarkdownExplorerLiteView } from './components/markdown-explorer-lite-view';

interface ChatLayoutProps {
  autoOpenSettings?: boolean;
}

export function ChatLayout({ autoOpenSettings }: ChatLayoutProps) {
  void autoOpenSettings;
  const currentProject = useAppStore((s) => s.currentProject);

  return <>{currentProject ? <MarkdownExplorerLiteView /> : <ChatNoProjectState />}</>;
}
