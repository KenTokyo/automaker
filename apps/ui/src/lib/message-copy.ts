import { splitOrchestratorMessage } from '@/lib/orchestrator-message';
import { stripEmbeddedSystemPrompts } from '@/lib/system-prompt-payload';

/**
 * Removes internal orchestrator wrappers so copy-to-clipboard only contains user-relevant text.
 */
export function getCopyableMessageContent(rawContent: string): string {
  const withoutEmbeddedPrompts = stripEmbeddedSystemPrompts(rawContent);
  return splitOrchestratorMessage(withoutEmbeddedPrompts).mainMessage;
}
