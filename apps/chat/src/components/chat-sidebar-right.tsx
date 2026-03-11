import { MarkdownExplorer } from './markdown-explorer';

interface ChatSidebarRightProps {
  projectPath: string | null;
  onClose: () => void;
}

export function ChatSidebarRight({ projectPath, onClose }: ChatSidebarRightProps) {
  return <MarkdownExplorer projectPath={projectPath} onClose={onClose} />;
}
