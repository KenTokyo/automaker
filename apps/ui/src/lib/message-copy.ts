const ORCHESTRATOR_HEADER_MARKER = 'ORCHESTRATOR MODE ACTIVE:';
const ORCHESTRATOR_FOOTER_MARKER = 'CRITICAL REMINDER - ORCHESTRATOR MODE:';
const ORCHESTRATOR_HEADER_SENTINELS = [
  '- You are working on a multi-phase project',
  '- Orchestrator run ID:',
  '- Current iteration:',
  '- Do NOT include NEXT_PHASE_READY if no more phases exist',
];
const ORCHESTRATOR_FOOTER_SENTINELS = [
  '- NEXT_PHASE_READY must ONLY appear at the VERY END of your response',
  '- The ONLY correct position for NEXT_PHASE_READY is at the END',
];

function hasAllSentinels(block: string, sentinels: string[]): boolean {
  return sentinels.every((sentinel) => block.includes(sentinel));
}

function stripLeadingOrchestratorWrapper(content: string): string {
  const trimmed = content.trimStart();
  const startsWithHeader =
    trimmed.startsWith(`🔄 ${ORCHESTRATOR_HEADER_MARKER}`) ||
    trimmed.startsWith(ORCHESTRATOR_HEADER_MARKER);

  if (!startsWithHeader) return content;

  const firstDoubleBreak = trimmed.indexOf('\n\n');
  if (firstDoubleBreak === -1) return content;

  const headerBlock = trimmed.slice(0, firstDoubleBreak);
  if (!hasAllSentinels(headerBlock, ORCHESTRATOR_HEADER_SENTINELS)) {
    return content;
  }

  return trimmed.slice(firstDoubleBreak + 2);
}

function stripTrailingOrchestratorWrapper(content: string): string {
  const footerIndex = content.lastIndexOf(`\n\n${ORCHESTRATOR_FOOTER_MARKER}`);
  const emojiFooterIndex = content.lastIndexOf(`\n\n⚠️ ${ORCHESTRATOR_FOOTER_MARKER}`);

  const bestIndex = Math.max(footerIndex, emojiFooterIndex);
  if (bestIndex === -1) return content;

  const footerBlock = content.slice(bestIndex + 2);
  if (!hasAllSentinels(footerBlock, ORCHESTRATOR_FOOTER_SENTINELS)) {
    return content;
  }

  return content.slice(0, bestIndex);
}

/**
 * Removes internal orchestrator wrappers so copy-to-clipboard only contains user-relevant text.
 */
export function getCopyableMessageContent(rawContent: string): string {
  const normalized = rawContent.replace(/\r\n/g, '\n');
  const withoutLeadingWrapper = stripLeadingOrchestratorWrapper(normalized);
  const withoutTrailingWrapper = stripTrailingOrchestratorWrapper(withoutLeadingWrapper);
  return withoutTrailingWrapper.trim();
}
