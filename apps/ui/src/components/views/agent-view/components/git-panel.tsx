import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Download,
  GitBranch,
  GitCommit,
  RefreshCw,
  Sparkles,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/store/app-store';
import { getElectronAPI } from '@/lib/electron';
import { queryKeys } from '@/lib/query-keys';
import { useGitDiffs, useWorktreeBranches } from '@/hooks/queries';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { GitDiffPanel } from '@/components/ui/git-diff-panel';
import { cn } from '@/lib/utils';

interface GitPanelProps {
  projectPath: string;
}

function getStatusTone(status: string): string {
  switch (status) {
    case 'A':
    case '?':
      return 'bg-green-500/15 text-green-500 border-green-500/30';
    case 'D':
      return 'bg-red-500/15 text-red-500 border-red-500/30';
    case 'M':
    case 'U':
      return 'bg-amber-500/15 text-amber-500 border-amber-500/30';
    case 'R':
    case 'C':
      return 'bg-blue-500/15 text-blue-500 border-blue-500/30';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

export function GitPanel({ projectPath }: GitPanelProps) {
  const queryClient = useQueryClient();
  const enableAiCommitMessages = useAppStore((state) => state.enableAiCommitMessages);
  const [commitMessage, setCommitMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const {
    data: gitDiffData,
    isFetching: isDiffFetching,
    refetch: refetchDiffs,
  } = useGitDiffs(projectPath, true);
  const {
    data: branchData,
    isFetching: isBranchFetching,
    refetch: refetchBranches,
  } = useWorktreeBranches(projectPath);

  const files = gitDiffData?.files ?? [];
  const hasChanges = files.length > 0;
  const isGitRepo = branchData?.isGitRepo ?? false;
  const hasCommits = branchData?.hasCommits ?? false;
  const aheadCount = branchData?.aheadCount ?? 0;
  const behindCount = branchData?.behindCount ?? 0;
  const hasRemoteBranch = branchData?.hasRemoteBranch ?? false;
  const currentBranch =
    branchData?.branches?.find((branch) => branch.isCurrent)?.name ??
    branchData?.branches?.[0]?.name ??
    'main';
  const hasPendingAction = isGenerating || isCommitting || isPushing || isPulling;

  const refreshGitState = useCallback(async () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.git.diffs(projectPath) });
    queryClient.invalidateQueries({ queryKey: queryKeys.worktrees.all(projectPath) });
    queryClient.invalidateQueries({ queryKey: queryKeys.worktrees.branches(projectPath) });
    await Promise.all([refetchDiffs(), refetchBranches()]);
  }, [projectPath, queryClient, refetchDiffs, refetchBranches]);

  const pushBranch = useCallback(async (): Promise<boolean> => {
    setIsPushing(true);
    try {
      const api = getElectronAPI();
      if (!api?.worktree?.push) {
        toast.error('Push API not available');
        return false;
      }

      const result = await api.worktree.push(projectPath);
      if (!result.success || !result.result) {
        toast.error(result.error || 'Failed to push changes');
        return false;
      }

      toast.success(result.result.message);
      await refreshGitState();
      return true;
    } catch (error) {
      toast.error('Failed to push changes', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    } finally {
      setIsPushing(false);
    }
  }, [projectPath, refreshGitState]);

  const handlePull = useCallback(async () => {
    setIsPulling(true);
    try {
      const api = getElectronAPI();
      if (!api?.worktree?.pull) {
        toast.error('Pull API not available');
        return;
      }

      const result = await api.worktree.pull(projectPath);
      if (!result.success || !result.result) {
        toast.error(result.error || 'Failed to pull changes');
        return;
      }

      toast.success(result.result.message);
      await refreshGitState();
    } catch (error) {
      toast.error('Failed to pull changes', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsPulling(false);
    }
  }, [projectPath, refreshGitState]);

  const handleGenerateCommitMessage = useCallback(async () => {
    setIsGenerating(true);
    try {
      const api = getElectronAPI();
      if (!api?.worktree?.generateCommitMessage) {
        toast.error('Commit message API not available');
        return;
      }

      const result = await api.worktree.generateCommitMessage(projectPath);
      if (!result.success || !result.message) {
        toast.error(result.error || 'Failed to generate commit message');
        return;
      }

      setCommitMessage(result.message);
      toast.success('Commit message generated');
    } catch (error) {
      toast.error('Failed to generate commit message', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsGenerating(false);
    }
  }, [projectPath]);

  const runCommit = useCallback(
    async (pushAfterCommit: boolean) => {
      if (!commitMessage.trim()) {
        toast.error('Please enter a commit message first');
        return;
      }

      setIsCommitting(true);
      try {
        const api = getElectronAPI();
        if (!api?.worktree?.commit) {
          toast.error('Commit API not available');
          return;
        }

        const result = await api.worktree.commit(projectPath, commitMessage.trim());
        if (!result.success || !result.result) {
          toast.error(result.error || 'Failed to commit changes');
          return;
        }

        if (result.result.committed) {
          const branchLabel = result.result.branch || currentBranch;
          const hashLabel = result.result.commitHash || 'latest';
          toast.success(`Committed ${hashLabel} on ${branchLabel}`);
          setCommitMessage('');
        } else {
          toast.info(result.result.message || 'No changes to commit');
        }

        await refreshGitState();

        if (pushAfterCommit) {
          await pushBranch();
        }
      } catch (error) {
        toast.error('Failed to commit changes', {
          description: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        setIsCommitting(false);
      }
    },
    [commitMessage, currentBranch, projectPath, pushBranch, refreshGitState]
  );

  const statusSummary = useMemo(() => {
    if (!isGitRepo) return 'Not a git repository';
    if (!hasCommits) return 'Repository has no commits yet';
    if (!hasChanges) return 'Working tree clean';
    return `${files.length} changed file${files.length === 1 ? '' : 's'}`;
  }, [files.length, hasChanges, hasCommits, isGitRepo]);

  return (
    <div className="h-full min-h-0 flex flex-col bg-background">
      <div className="border-b border-border px-3 py-2.5 space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <GitBranch className="h-4 w-4 text-primary" />
          <span className="font-medium truncate">{currentBranch}</span>
          <span className="text-muted-foreground text-xs ml-auto">{statusSummary}</span>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded border border-border px-1.5 py-0.5">ahead {aheadCount}</span>
          <span className="rounded border border-border px-1.5 py-0.5">behind {behindCount}</span>
          <span className="rounded border border-border px-1.5 py-0.5">
            {hasRemoteBranch ? 'tracked' : 'no upstream'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => void handlePull()}
            disabled={hasPendingAction || !isGitRepo || !hasCommits}
          >
            {isPulling ? (
              <Spinner size="sm" className="mr-1.5" />
            ) : (
              <Download className="h-3.5 w-3.5 mr-1.5" />
            )}
            Pull
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => void pushBranch()}
            disabled={hasPendingAction || !isGitRepo || !hasCommits}
          >
            {isPushing ? (
              <Spinner size="sm" className="mr-1.5" />
            ) : (
              <Upload className="h-3.5 w-3.5 mr-1.5" />
            )}
            Push
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 ml-auto"
            onClick={() => void refreshGitState()}
            disabled={hasPendingAction}
          >
            {isDiffFetching || isBranchFetching ? (
              <Spinner size="sm" className="mr-1.5" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      <div className="border-b border-border px-3 py-3 space-y-2">
        <Textarea
          value={commitMessage}
          onChange={(event) => setCommitMessage(event.target.value)}
          placeholder="Write your commit message..."
          className="min-h-[84px] text-sm font-mono"
          disabled={hasPendingAction || !isGitRepo}
        />
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => void handleGenerateCommitMessage()}
            disabled={hasPendingAction || !isGitRepo || !hasChanges || !enableAiCommitMessages}
          >
            {isGenerating ? (
              <Spinner size="sm" className="mr-1.5" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            )}
            Auto
          </Button>
          <Button
            size="sm"
            className="h-8"
            onClick={() => void runCommit(false)}
            disabled={hasPendingAction || !isGitRepo || !commitMessage.trim()}
          >
            {isCommitting ? (
              <Spinner size="sm" className="mr-1.5" />
            ) : (
              <GitCommit className="h-3.5 w-3.5 mr-1.5" />
            )}
            Commit
          </Button>
          <Button
            size="sm"
            className="h-8"
            variant="secondary"
            onClick={() => void runCommit(true)}
            disabled={hasPendingAction || !isGitRepo || !commitMessage.trim()}
          >
            {isCommitting || isPushing ? (
              <Spinner size="sm" className="mr-1.5" />
            ) : (
              <Upload className="h-3.5 w-3.5 mr-1.5" />
            )}
            Commit & Push
          </Button>
        </div>
        {!isGitRepo && (
          <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-3.5 w-3.5" />
            Git is not initialized for this project.
          </div>
        )}
      </div>

      <div className="border-b border-border px-3 py-2">
        <div className="text-xs font-medium text-muted-foreground mb-2">Changed Paths</div>
        <div className="max-h-28 overflow-y-auto space-y-1 scrollbar-visible">
          {files.length === 0 ? (
            <div className="text-xs text-muted-foreground">No changed files.</div>
          ) : (
            files.map((file) => (
              <div
                key={`${file.status}-${file.path}`}
                className="flex items-center gap-2 min-w-0"
                title={file.path}
              >
                <span
                  className={cn(
                    'inline-flex min-w-5 justify-center rounded border px-1 py-0.5 text-[10px] font-semibold',
                    getStatusTone(file.status)
                  )}
                >
                  {file.status}
                </span>
                <span className="truncate text-xs font-mono text-foreground/90">{file.path}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        <GitDiffPanel
          projectPath={projectPath}
          featureId={currentBranch}
          useWorktrees={false}
          compact={false}
        />
      </div>
    </div>
  );
}
