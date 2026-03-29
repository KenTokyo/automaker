/**
 * Session Signal Types
 *
 * Signals are special markers detected in the last AI message of a session.
 * They provide visual status indicators in the session history list.
 *
 * - ALL_PHASES_COMPLETE: All orchestrator phases finished (green badge)
 * - QUESTION: AI is waiting for user input/answer (violet badge)
 */

/** Possible signal states detected from the last AI message */
export type SessionSignal = 'all_phases_complete' | 'question' | null;

/** Signal detection keywords (matched case-insensitively in last AI message) */
export const SESSION_SIGNAL_KEYWORDS = {
  all_phases_complete: 'ALL_PHASES_COMPLETE',
  question: 'QUESTION',
} as const satisfies Record<NonNullable<SessionSignal>, string>;

/**
 * Detect signal from the content of the last AI (assistant) message.
 *
 * Rules:
 * - ALL_PHASES_COMPLETE: only relevant for orchestrator sessions
 *   (checked as word boundary match anywhere in last message text)
 * - QUESTION: checked for ALL sessions
 *   (matched as standalone word at the end of the message)
 * - If BOTH are present, ALL_PHASES_COMPLETE wins (it's the final state)
 *
 * @param content - The text content of the last assistant message
 * @param isOrchestratorSession - Whether this session belongs to an orchestrator run
 * @returns The detected signal or null
 */
export function detectSessionSignal(
  content: string | undefined | null,
  isOrchestratorSession: boolean
): SessionSignal {
  if (!content || content.trim().length === 0) return null;

  // Normalize: strip trailing whitespace/newlines per line, get last meaningful lines
  const normalized = content.replace(/\r\n/g, '\n').trim();

  // Check ALL_PHASES_COMPLETE first (only for orchestrator sessions)
  if (isOrchestratorSession) {
    const apcPattern = /\bALL_PHASES_COMPLETE\b/i;
    if (apcPattern.test(normalized)) {
      return 'all_phases_complete';
    }
  }

  // Check QUESTION signal: look for standalone "QUESTION" keyword
  // typically at the end of the message (last ~500 chars for performance)
  const tail = normalized.length > 500 ? normalized.slice(-500) : normalized;
  const questionPattern = /\bQUESTION\b/i;
  if (questionPattern.test(tail)) {
    return 'question';
  }

  return null;
}
