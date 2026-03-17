const SYSTEM_PROMPT_BLOCK_REGEX =
  /<!--\s*AUTOMAKER_SYSTEM_PROMPTS_START[\s\S]*?AUTOMAKER_SYSTEM_PROMPTS_END\s*-->\s*/g;

interface SystemPromptPayload {
  agentPromptsText?: string;
  orchestratorPreMessage?: string;
  orchestratorPostMessage?: string;
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
