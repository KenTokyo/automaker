import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FolderOpen, RefreshCw } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppStore } from '@/store/app-store';
import { useExplorerStore } from '@/store/explorer-store';
import { FilesPanel } from '@/components/views/agent-view/components/files-panel/files-panel';
import { CompletedTasksPanel } from '@/components/session-manager/completed-tasks-panel';
import { MarkdownLiteInput } from './markdown-lite-input';

const LOAD_TIMEOUT_MS = 12_000;

export function MarkdownExplorerLiteView() {
  const { currentProject, projects, setCurrentProject } = useAppStore(
    useShallow((state) => ({
      currentProject: state.currentProject,
      projects: state.projects,
      setCurrentProject: state.setCurrentProject,
    }))
  );

  const isLoadingRoot = useExplorerStore((state) => state.isLoadingRoot);
  const [loadingStuck, setLoadingStuck] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!isLoadingRoot) {
      setLoadingStuck(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setLoadingStuck(true);
    }, LOAD_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isLoadingRoot, refreshKey]);

  const projectPath = currentProject?.path ?? '';
  const projectTitle = currentProject?.name ?? 'Kein Projekt';

  const filesPanelKey = useMemo(() => {
    return `${projectPath}-${refreshKey}`;
  }, [projectPath, refreshKey]);

  if (!currentProject) return null;

  const handleRefreshExplorer = () => {
    useExplorerStore.getState().setProjectPath(projectPath);
    setLoadingStuck(false);
    setRefreshKey((value) => value + 1);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex items-center justify-between gap-2 border-b border-muted bg-card/80 px-3 py-2">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
          <h1 className="text-sm font-semibold">Markdown Explorer</h1>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="max-w-[320px] justify-start border-muted text-left"
              >
                <span className="truncate">{projectTitle}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-96">
              {projects.map((project) => (
                <DropdownMenuItem
                  key={project.id}
                  onClick={() => setCurrentProject(project)}
                  className="flex flex-col items-start gap-0.5"
                >
                  <span className="font-medium">{project.name}</span>
                  <span className="max-w-[340px] truncate text-xs text-muted-foreground">
                    {project.path}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="flex h-full min-h-0 flex-col lg:flex-row">
          <aside className="flex h-[42%] min-h-[280px] w-full min-w-0 flex-col border-b border-muted lg:h-full lg:w-[360px] lg:shrink-0 lg:border-b-0 lg:border-r">
            <div className="flex items-center gap-2 border-b border-muted px-3 py-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Completed</h2>
            </div>
            <div className="min-h-0 flex-1">
              <CompletedTasksPanel projectPath={projectPath} />
            </div>
          </aside>

          <section className="min-h-0 min-w-0 flex-1">
            <div className="flex h-full min-h-0 flex-col">
              {loadingStuck && (
                <div className="flex items-center justify-between gap-2 border-b border-amber-300/50 bg-amber-100/50 px-3 py-2 text-xs text-amber-900">
                  <span>Das Laden der Markdown-Dateien dauert zu lange. Bitte neu laden.</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 border-amber-400/70"
                    onClick={handleRefreshExplorer}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Reload
                  </Button>
                </div>
              )}

              <div className="min-h-0 flex-1">
                <FilesPanel key={filesPanelKey} projectPath={projectPath} />
              </div>

              <MarkdownLiteInput
                projectPath={projectPath}
                onSaved={() => {
                  handleRefreshExplorer();
                }}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
