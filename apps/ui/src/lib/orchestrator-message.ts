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

const LEADING_MARKER_PREFIX = '(?:[^\\w\\n]+\\s*)?';
const HEADER_START_REGEX = new RegExp(`^${LEADING_MARKER_PREFIX}${ORCHESTRATOR_HEADER_MARKER}`);
const FOOTER_WITH_SEPARATOR_REGEX = new RegExp(
  `\\n\\n${LEADING_MARKER_PREFIX}${ORCHESTRATOR_FOOTER_MARKER}`,
  'g'
);

export interface OrchestratorMessageSplit {
  preMessage: string | null;
  mainMessage: string;
  postMessage: string | null;
}

function hasAllSentinels(block: string, sentinels: string[]): boolean {
  return sentinels.every((sentinel) => block.includes(sentinel));
}

function extractLeadingWrapper(content: string): { wrapper: string | null; remaining: string } {
  const trimmed = content.trimStart();
  if (!HEADER_START_REGEX.test(trimmed)) {
    return { wrapper: null, remaining: content };
  }

  const firstDoubleBreak = trimmed.indexOf('\n\n');
  if (firstDoubleBreak === -1) {
    return { wrapper: null, remaining: content };
  }

  const headerBlock = trimmed.slice(0, firstDoubleBreak);
  if (!hasAllSentinels(headerBlock, ORCHESTRATOR_HEADER_SENTINELS)) {
    return { wrapper: null, remaining: content };
  }

  return {
    wrapper: headerBlock,
    remaining: trimmed.slice(firstDoubleBreak + 2),
  };
}

function findFooterStartIndex(content: string): number {
  let lastMatchStart = -1;
  for (const match of content.matchAll(FOOTER_WITH_SEPARATOR_REGEX)) {
    if (typeof match.index === 'number') {
      lastMatchStart = match.index;
    }
  }
  return lastMatchStart;
}

function extractTrailingWrapper(content: string): { wrapper: string | null; remaining: string } {
  const footerStart = findFooterStartIndex(content);
  if (footerStart === -1) {
    return { wrapper: null, remaining: content };
  }

  const footerBlock = content.slice(footerStart + 2);
  if (!hasAllSentinels(footerBlock, ORCHESTRATOR_FOOTER_SENTINELS)) {
    return { wrapper: null, remaining: content };
  }

  return {
    wrapper: footerBlock,
    remaining: content.slice(0, footerStart),
  };
}

/**
 * Splits a message into optional orchestrator header/footer wrappers and the user-visible core text.
 */
export function splitOrchestratorMessage(rawContent: string): OrchestratorMessageSplit {
  const normalized = rawContent.replace(/\r\n/g, '\n');

  const { wrapper: preMessage, remaining: withoutHeader } = extractLeadingWrapper(normalized);
  const { wrapper: postMessage, remaining: withoutFooter } = extractTrailingWrapper(withoutHeader);

  return {
    preMessage,
    mainMessage: withoutFooter.trim(),
    postMessage,
  };
}
