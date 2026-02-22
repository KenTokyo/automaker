import { describe, expect, it } from 'vitest';
import { parseSessionInfo } from '@/lib/session-title.js';

describe('session-title.ts', () => {
  describe('parseSessionInfo', () => {
    it('parses and removes a strict SESSION_INFO block', () => {
      const content = `[SESSION_INFO]
TITLE: Model Test
DESCRIPTION: Initial setup description
Follow-up context line
[/SESSION_INFO]

This is the assistant response.`;

      const parsed = parseSessionInfo(content);

      expect(parsed.title).toBe('Model Test');
      expect(parsed.description).toContain('Initial setup description');
      expect(parsed.cleanedContent).toBe('This is the assistant response.');
    });

    it('parses incomplete SESSION_INFO blocks without closing tag', () => {
      const content = `[SESSION_INFO]
**TITLE:** Model Test & Initialization
**DESCRIPTION:** Initial orchestrator session context
More details for setup

Here is the actual assistant response.`;

      const parsed = parseSessionInfo(content);

      expect(parsed.title).toBe('Model Test & Initialization');
      expect(parsed.description).toContain('Initial orchestrator session context');
      expect(parsed.cleanedContent).toBe('Here is the actual assistant response.');
    });

    it('parses incomplete SESSION_INFO at end-of-message when no extra response is present', () => {
      const content = `[SESSION_INFO]
TITLE: Setup
DESCRIPTION: Short summary`;

      const parsed = parseSessionInfo(content);

      expect(parsed.title).toBe('Setup');
      expect(parsed.description).toBe('Short summary');
      expect(parsed.cleanedContent).toBe('');
    });

    it('returns original content when SESSION_INFO is not parseable yet', () => {
      const content = '[SESSION_INFO]\nTITLE';

      const parsed = parseSessionInfo(content);

      expect(parsed.title).toBeNull();
      expect(parsed.description).toBeNull();
      expect(parsed.cleanedContent).toBe(content);
    });
  });
});
