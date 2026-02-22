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

function extractTitle(infoBlock: string): string | null {
  const titleMatch = infoBlock.match(/^\s*(?:\*\*)?TITLE(?:\*\*)?\s*:\s*(.+?)(?:\n|$)/im);
  if (!titleMatch) {
    return null;
  }

  const cleanedTitle = titleMatch[1]
    .trim()
    .replace(/^\*\*\s*/, '')
    .replace(/\s*\*\*$/, '')
    .trim();
  return cleanedTitle.substring(0, 60);
}

function extractDescription(infoBlock: string): string | null {
  const descMatch = infoBlock.match(/^\s*(?:\*\*)?DESCRIPTION(?:\*\*)?\s*:\s*([\s\S]*?)$/im);
  if (!descMatch) {
    return null;
  }

  let desc = descMatch[1]
    .trim()
    .replace(/^\*\*\s*/, '')
    .replace(/\s*\*\*$/, '')
    .trim();
  if (desc.length > 300) {
    desc = `${desc.substring(0, 300)}...`;
  }
  return desc.length > 0 ? desc : null;
}

function buildCleanedContent(
  content: string,
  blockStart: number,
  blockEndExclusive: number
): string {
  const prefix = content.slice(0, blockStart).trimEnd();
  const suffix = content.slice(blockEndExclusive).trimStart();

  if (prefix && suffix) {
    return `${prefix}\n\n${suffix}`;
  }

  return (prefix || suffix).trim();
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

  // Strict match with explicit opening and closing tag.
  const strictSessionInfoRegex = /\[SESSION_INFO\]\s*([\s\S]*?)\s*\[\/SESSION_INFO\]/i;
  const strictMatch = content.match(strictSessionInfoRegex);
  if (strictMatch && strictMatch.index !== undefined) {
    const infoBlock = strictMatch[1];
    result.title = extractTitle(infoBlock);
    result.description = extractDescription(infoBlock);
    result.cleanedContent = content.replace(strictSessionInfoRegex, '').trim();
    result.cleanedContent = result.cleanedContent.replace(/^\n+/, '');
    return result;
  }

  // Fallback: handle incomplete blocks that include [SESSION_INFO] but omit [/SESSION_INFO].
  const openTagMatch = /\[SESSION_INFO\]/i.exec(content);
  if (!openTagMatch || openTagMatch.index === undefined) {
    return result;
  }

  const blockStart = openTagMatch.index;
  const contentAfterOpenTag = content.slice(blockStart + openTagMatch[0].length);
  const closingTagMatch = /\[\/SESSION_INFO\]/i.exec(contentAfterOpenTag);

  let infoBlock = '';
  let blockEndExclusive = content.length;

  if (closingTagMatch && closingTagMatch.index !== undefined) {
    infoBlock = contentAfterOpenTag.slice(0, closingTagMatch.index);
    blockEndExclusive =
      blockStart + openTagMatch[0].length + closingTagMatch.index + closingTagMatch[0].length;
  } else {
    // Heuristic: keep SESSION_INFO hidden only until the first paragraph break.
    const hasStructuredFields = /(?:^|\n)\s*(?:\*\*)?(TITLE|DESCRIPTION)(?:\*\*)?\s*:/i.test(
      contentAfterOpenTag
    );
    if (!hasStructuredFields) {
      return result;
    }

    const paragraphBreakMatch = /\n\s*\n/.exec(contentAfterOpenTag);
    const inferredEnd = paragraphBreakMatch?.index ?? contentAfterOpenTag.length;
    infoBlock = contentAfterOpenTag.slice(0, inferredEnd);
    blockEndExclusive = blockStart + openTagMatch[0].length + inferredEnd;
  }

  const title = extractTitle(infoBlock);
  const description = extractDescription(infoBlock);

  if (!title && !description) {
    return result;
  }

  result.title = title;
  result.description = description;
  result.cleanedContent = buildCleanedContent(content, blockStart, blockEndExclusive);

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
