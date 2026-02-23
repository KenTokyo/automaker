import { splitOrchestratorMessage } from '@/lib/orchestrator-message';

/**
 * Removes internal orchestrator wrappers so copy-to-clipboard only contains user-relevant text.
 */
export function getCopyableMessageContent(rawContent: string): string {
  return splitOrchestratorMessage(rawContent).mainMessage;
}
