const SYSTEM_PROMPT_BLOCK_REGEX =
  /<!--\s*AUTOMAKER_SYSTEM_PROMPTS_START[\s\S]*?AUTOMAKER_SYSTEM_PROMPTS_END\s*-->\s*/g;

const SYSTEM_PROMPT_CAPTURE_REGEX =
  /<!--\s*AUTOMAKER_SYSTEM_PROMPTS_START([\s\S]*?)AUTOMAKER_SYSTEM_PROMPTS_END\s*-->/;

const SECTION_REGEX = (tag: string) => new RegExp(`\\[${tag}\\]\\n([\\s\\S]*?)\\n\\[/${tag}\\]`);

export interface SystemPromptPayload {
  agentPromptsText?: string;
  orchestratorPreMessage?: string;
  orchestratorPostMessage?: string;
}

export interface ExtractedSystemPrompts {
  orchestratorPre: string | null;
  agentPrompts: string | null;
  orchestratorPost: string | null;
}

function normalizePart(value?: string): string | null {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

export function hasEmbeddedSystemPrompts(content: string): boolean {
  return content.includes('AUTOMAKER_SYSTEM_PROMPTS_START');
}

export function stripEmbeddedSystemPrompts(content: string): string {
  return content.replace(SYSTEM_PROMPT_BLOCK_REGEX, '').trim();
}

export function embedSystemPrompts(content: string, payload: SystemPromptPayload): string {
  const agentPromptsText = normalizePart(payload.agentPromptsText);
  const orchestratorPreMessage = normalizePart(payload.orchestratorPreMessage);
  const orchestratorPostMessage = normalizePart(payload.orchestratorPostMessage);

  if (!agentPromptsText && !orchestratorPreMessage && !orchestratorPostMessage) {
    return content;
  }

  const sections: string[] = [];

  if (orchestratorPreMessage) {
    sections.push(`[ORCHESTRATOR_PRE]\n${orchestratorPreMessage}\n[/ORCHESTRATOR_PRE]`);
  }

  if (agentPromptsText) {
    sections.push(`[AGENT_PROMPTS]\n${agentPromptsText}\n[/AGENT_PROMPTS]`);
  }

  if (orchestratorPostMessage) {
    sections.push(`[ORCHESTRATOR_POST]\n${orchestratorPostMessage}\n[/ORCHESTRATOR_POST]`);
  }

  const hiddenBlock = `<!-- AUTOMAKER_SYSTEM_PROMPTS_START\n${sections.join('\n\n')}\nAUTOMAKER_SYSTEM_PROMPTS_END -->`;
  return `${hiddenBlock}\n\n${content}`;
}

/**
 * Extracts the individual system prompt sections from a message content string.
 * Returns null fields if the message contains no embedded system prompts.
 */
export function extractEmbeddedSystemPrompts(content: string): ExtractedSystemPrompts | null {
  const match = SYSTEM_PROMPT_CAPTURE_REGEX.exec(content);
  if (!match) return null;

  const block = match[1];

  const preMatch = SECTION_REGEX('ORCHESTRATOR_PRE').exec(block);
  const agentMatch = SECTION_REGEX('AGENT_PROMPTS').exec(block);
  const postMatch = SECTION_REGEX('ORCHESTRATOR_POST').exec(block);

  const result: ExtractedSystemPrompts = {
    orchestratorPre: preMatch ? preMatch[1].trim() : null,
    agentPrompts: agentMatch ? agentMatch[1].trim() : null,
    orchestratorPost: postMatch ? postMatch[1].trim() : null,
  };

  // Return null if nothing was found at all
  if (!result.orchestratorPre && !result.agentPrompts && !result.orchestratorPost) {
    return null;
  }

  return result;
}
