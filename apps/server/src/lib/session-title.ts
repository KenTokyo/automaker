/**
 * Session Title Generation Utilities
 *
 * Handles automatic extraction of session titles and descriptions
 * from the first Claude response in a conversation.
 */

/**
 * Instruction to prepend to the first user message in a new session.
 * Asks Claude to generate a title and description summarizing the user's request.
 */
export const SESSION_TITLE_INSTRUCTION = `[IMPORTANT: This is the FIRST message in a new session. Before your normal response, please provide a title and brief description summarizing the user's request in the following format:

[SESSION_INFO]
TITLE: A concise title (max 50 chars) summarizing what the user wants to do
DESCRIPTION: A 2-4 line description explaining the user's request and what you will help with
[/SESSION_INFO]

After the SESSION_INFO block, continue with your normal response to help the user.]

`;

/**
 * Result of parsing session info from Claude's response
 */
export interface ParsedSessionInfo {
  title: string | null;
  description: string | null;
  cleanedContent: string;
}

/**
 * Parses the session title and description from Claude's first response.
 * Extracts the [SESSION_INFO] block and returns the cleaned content without it.
 *
 * @param content - The full response content from Claude
 * @returns Parsed session info with title, description, and cleaned content
 */
export function parseSessionInfo(content: string): ParsedSessionInfo {
  const result: ParsedSessionInfo = {
    title: null,
    description: null,
    cleanedContent: content,
  };

  // Match the SESSION_INFO block
  const sessionInfoRegex = /\[SESSION_INFO\]\s*([\s\S]*?)\s*\[\/SESSION_INFO\]/i;
  const match = content.match(sessionInfoRegex);

  if (!match) {
    return result;
  }

  const infoBlock = match[1];

  // Extract title
  const titleMatch = infoBlock.match(/TITLE:\s*(.+?)(?:\n|$)/i);
  if (titleMatch) {
    result.title = titleMatch[1].trim().substring(0, 60); // Limit to 60 chars
  }

  // Extract description - everything after DESCRIPTION: until end of block
  const descMatch = infoBlock.match(/DESCRIPTION:\s*([\s\S]*?)$/i);
  if (descMatch) {
    // Clean up the description - normalize whitespace but preserve line breaks
    let desc = descMatch[1].trim();
    // Limit to roughly 4 lines (about 300 chars)
    if (desc.length > 300) {
      desc = desc.substring(0, 300) + '...';
    }
    result.description = desc;
  }

  // Remove the SESSION_INFO block from the content
  result.cleanedContent = content.replace(sessionInfoRegex, '').trim();

  // Also remove any leading newlines that might remain
  result.cleanedContent = result.cleanedContent.replace(/^\n+/, '');

  return result;
}

/**
 * Checks if this is the first message in a session (no previous conversation history)
 *
 * @param messageCount - Number of messages currently in the session
 * @returns true if this is the first user message
 */
export function isFirstMessage(messageCount: number): boolean {
  return messageCount === 0;
}

/**
 * Prepends the session title instruction to the user's first message
 *
 * @param message - The original user message
 * @returns The message with the title instruction prepended
 */
export function prependTitleInstruction(message: string): string {
  return SESSION_TITLE_INSTRUCTION + message;
}
