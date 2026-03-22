import { useMemo } from 'react';
import { useSessionHistory } from '@/hooks/queries/use-sessions';
import { extractFilePathsFromMessages, type ExtractedFileInfo } from '@/lib/extract-session-files';

interface UseSessionFilesResult {
  files: ExtractedFileInfo | null;
  isLoading: boolean;
}

export function useSessionFiles(
  sessionId: string | undefined,
  enabled: boolean
): UseSessionFilesResult {
  const { data, isLoading } = useSessionHistory(enabled ? sessionId : undefined);

  const files = useMemo(() => {
    if (!data?.messages || data.messages.length === 0) return null;
    return extractFilePathsFromMessages(data.messages);
  }, [data?.messages]);

  return { files, isLoading };
}
