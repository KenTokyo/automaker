/**
 * Copy All Chat Utility
 *
 * Formats the entire chat history for copying/pasting into a new session.
 * Extracts file operations and creates a structured summary.
 */

import type { Message } from '@/types/electron';
import { getCopyableMessageContent } from '@/lib/message-copy';

/**
 * Extracted file operation from chat messages
 */
interface FileOperation {
  path: string;
  operation: 'read' | 'write' | 'edit' | 'delete';
  timestamp?: string;
}

/**
 * Parsed chat summary
 */
interface ChatSummary {
  formattedChat: string;
  filesRead: string[];
  filesWritten: string[];
  filesEdited: string[];
  filesDeleted: string[];
  truncatedMessages: number;
}

interface GenerateChatSummaryOptions {
  /**
   * Maximum characters per message.
   * Set to null for no truncation.
   */
  maxMessageChars?: number | null;
}

export interface ContextSummaryResult {
  text: string;
  wasTruncated: boolean;
}

interface GenerateContextSummaryOptions {
  recentMessageLimit?: number;
  recentMessageCharLimit?: number | null;
}

/**
 * Extract file paths from message content using regex patterns
 * Looks for common patterns like:
 * - Read tool: "Reading file: /path/to/file"
 * - Write tool: "Writing to file: /path/to/file"
 * - Edit tool: "Editing file: /path/to/file"
 * - Tool use blocks with file paths
 */
function extractFileOperations(content: string): FileOperation[] {
  const operations: FileOperation[] = [];

  // Pattern for Read operations
  const readPatterns = [
    /(?:Reading|Read|Opened|Opening)\s+(?:file:?\s*)?[`"']?([^\s`"'\n]+\.[a-zA-Z0-9]+)[`"']?/gi,
    /Read\s+tool[^`]*`([^`]+)`/gi,
    /file_path[`"']?\s*:\s*[`"']?([^\s`"'\n,}]+)[`"']?/gi,
    /```(?:read|file)[^\n]*\n([^\n]+)/gi,
  ];

  // Pattern for Write operations
  const writePatterns = [
    /(?:Writing|Wrote|Created|Creating)\s+(?:file:?\s*|to:?\s*)?[`"']?([^\s`"'\n]+\.[a-zA-Z0-9]+)[`"']?/gi,
    /Write\s+tool[^`]*`([^`]+)`/gi,
    /(?:new file|created)[:\s]+[`"']?([^\s`"'\n]+\.[a-zA-Z0-9]+)[`"']?/gi,
  ];

  // Pattern for Edit operations
  const editPatterns = [
    /(?:Editing|Edited|Modified|Modifying)\s+(?:file:?\s*)?[`"']?([^\s`"'\n]+\.[a-zA-Z0-9]+)[`"']?/gi,
    /Edit\s+tool[^`]*`([^`]+)`/gi,
  ];

  // Pattern for Delete operations
  const deletePatterns = [
    /(?:Deleting|Deleted|Removed|Removing)\s+(?:file:?\s*)?[`"']?([^\s`"'\n]+\.[a-zA-Z0-9]+)[`"']?/gi,
  ];

  // Extract from patterns
  const extractFromPatterns = (
    patterns: RegExp[],
    operation: 'read' | 'write' | 'edit' | 'delete'
  ) => {
    for (const pattern of patterns) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(content)) !== null) {
        const path = match[1]?.trim();
        if (path && path.length > 2 && !path.includes(' ')) {
          operations.push({ path, operation });
        }
      }
    }
  };

  extractFromPatterns(readPatterns, 'read');
  extractFromPatterns(writePatterns, 'write');
  extractFromPatterns(editPatterns, 'edit');
  extractFromPatterns(deletePatterns, 'delete');

  return operations;
}

/**
 * Deduplicate file paths while preserving order
 */
function deduplicatePaths(paths: string[]): string[] {
  return [...new Set(paths)];
}

/**
 * Format a single message for copying
 */
function formatMessage(
  message: Message,
  maxMessageChars: number | null
): { text: string; wasTruncated: boolean } {
  const role = message.role === 'user' ? 'User' : 'KI';
  const timestamp = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const timePrefix = timestamp ? `[${timestamp}] ` : '';

  // Truncate very long messages for summary
  let content = getCopyableMessageContent(message.content);
  let wasTruncated = false;
  if (
    typeof maxMessageChars === 'number' &&
    maxMessageChars > 0 &&
    content.length > maxMessageChars
  ) {
    content = `${content.substring(0, maxMessageChars)}\n...`;
    wasTruncated = true;
  }

  return {
    text: `${timePrefix}${role}:\n${content}`,
    wasTruncated,
  };
}

/**
 * Generate the complete chat summary for copying
 */
export function generateChatSummary(
  messages: Message[],
  options: GenerateChatSummaryOptions = {}
): ChatSummary {
  const maxMessageChars = options.maxMessageChars ?? 5000;
  const filesRead: string[] = [];
  const filesWritten: string[] = [];
  const filesEdited: string[] = [];
  const filesDeleted: string[] = [];
  let truncatedMessages = 0;

  // Process each message
  const formattedMessages: string[] = [];

  for (const message of messages) {
    // Skip welcome message
    if (message.id === 'welcome') continue;

    // Format the message
    const formatted = formatMessage(message, maxMessageChars);
    formattedMessages.push(formatted.text);
    if (formatted.wasTruncated) {
      truncatedMessages += 1;
    }

    // Extract file operations from assistant messages
    if (message.role === 'assistant') {
      const operations = extractFileOperations(message.content);
      for (const op of operations) {
        switch (op.operation) {
          case 'read':
            filesRead.push(op.path);
            break;
          case 'write':
            filesWritten.push(op.path);
            break;
          case 'edit':
            filesEdited.push(op.path);
            break;
          case 'delete':
            filesDeleted.push(op.path);
            break;
        }
      }
    }
  }

  // Build the formatted output
  const sections: string[] = [];

  // Header
  sections.push('=== CHAT HISTORY EXPORT ===');
  sections.push(`Exported: ${new Date().toLocaleString('de-DE')}`);
  sections.push(`Messages: ${formattedMessages.length}`);
  sections.push('');

  // File operations summary
  const dedupedRead = deduplicatePaths(filesRead);
  const dedupedWritten = deduplicatePaths(filesWritten);
  const dedupedEdited = deduplicatePaths(filesEdited);
  const dedupedDeleted = deduplicatePaths(filesDeleted);

  if (
    dedupedRead.length > 0 ||
    dedupedWritten.length > 0 ||
    dedupedEdited.length > 0 ||
    dedupedDeleted.length > 0
  ) {
    sections.push('=== FILE OPERATIONS ===');

    if (dedupedRead.length > 0) {
      sections.push('');
      sections.push('Files Read:');
      dedupedRead.forEach((f) => sections.push(`  - ${f}`));
    }

    if (dedupedWritten.length > 0) {
      sections.push('');
      sections.push('Files Created/Written:');
      dedupedWritten.forEach((f) => sections.push(`  - ${f}`));
    }

    if (dedupedEdited.length > 0) {
      sections.push('');
      sections.push('Files Edited:');
      dedupedEdited.forEach((f) => sections.push(`  - ${f}`));
    }

    if (dedupedDeleted.length > 0) {
      sections.push('');
      sections.push('Files Deleted:');
      dedupedDeleted.forEach((f) => sections.push(`  - ${f}`));
    }

    sections.push('');
  }

  // Chat content
  sections.push('=== CONVERSATION ===');
  sections.push('');
  sections.push(formattedMessages.join('\n\n---\n\n'));

  return {
    formattedChat: sections.join('\n'),
    filesRead: dedupedRead,
    filesWritten: dedupedWritten,
    filesEdited: dedupedEdited,
    filesDeleted: dedupedDeleted,
    truncatedMessages,
  };
}

/**
 * Generate a compact context summary for continuing in a new session
 */
export function generateContextSummary(
  messages: Message[],
  options: GenerateContextSummaryOptions = {}
): ContextSummaryResult {
  const summary = generateChatSummary(messages);
  const recentMessageLimit = options.recentMessageLimit ?? 6;
  const recentMessageCharLimit = options.recentMessageCharLimit ?? 1000;

  const sections: string[] = [];
  let wasTruncated = false;

  sections.push('CONTEXT FROM PREVIOUS SESSION:');
  sections.push('');

  // File operations (compact)
  const allFiles = [
    ...summary.filesRead.map((f) => `[R] ${f}`),
    ...summary.filesWritten.map((f) => `[W] ${f}`),
    ...summary.filesEdited.map((f) => `[E] ${f}`),
  ];

  if (allFiles.length > 0) {
    sections.push('Files touched:');
    // Limit to most recent 20 files
    const recentFiles = allFiles.slice(-20);
    recentFiles.forEach((f) => sections.push(`  ${f}`));
    if (allFiles.length > 20) {
      sections.push(`  ... and ${allFiles.length - 20} more files`);
    }
    sections.push('');
  }

  // Last few messages (most relevant context)
  const relevantMessages = messages.filter((m) => m.id !== 'welcome').slice(-recentMessageLimit);

  if (relevantMessages.length > 0) {
    sections.push('Recent conversation:');
    sections.push('');
    for (const msg of relevantMessages) {
      const role = msg.role === 'user' ? 'User' : 'KI';
      // Keep recent context compact for inline continuation messages
      let content = getCopyableMessageContent(msg.content);
      if (
        typeof recentMessageCharLimit === 'number' &&
        recentMessageCharLimit > 0 &&
        content.length > recentMessageCharLimit
      ) {
        content = `${content.substring(0, recentMessageCharLimit)}...`;
        wasTruncated = true;
      }
      sections.push(`${role}: ${content}`);
      sections.push('');
    }
  }

  sections.push('---');
  sections.push('Bitte setze die Aufgabe aus diesem Kontext direkt fort.');

  return {
    text: sections.join('\n'),
    wasTruncated: wasTruncated || summary.truncatedMessages > 0,
  };
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}
