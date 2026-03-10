import { useState, useCallback } from 'react';
import { useAppStore } from '@/store/app-store';
import { initializeProject } from '@/lib/project-init';
import { getAuthenticatedImageUrl } from '@/lib/api-fetch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Project } from '@/lib/electron';
import { Sparkles, Plus, Folder } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { createLogger } from '@automaker/utils/logger';

const logger = createLogger('ChatNoProjectState');

function getProjectIcon(project: Project): LucideIcon {
  if (project.icon && project.icon in LucideIcons) {
    return (LucideIcons as unknown as Record<string, LucideIcon>)[project.icon];
  }
  return Folder;
}

export function ChatNoProjectState() {
  const projects = useAppStore((s) => s.projects);
  const upsertAndSetCurrentProject = useAppStore((s) => s.upsertAndSetCurrentProject);
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [projectPath, setProjectPath] = useState('');
  const [projectName, setProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateProject = useCallback(async () => {
    if (!projectPath.trim() || !projectName.trim()) return;
    setIsCreating(true);
    setError(null);
    try {
      const result = await initializeProject(projectPath.trim());
      if (!result.success) {
        setError(result.error || 'Failed to initialize project');
        return;
      }
      upsertAndSetCurrentProject(projectPath.trim(), projectName.trim());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      logger.error('Failed to create project:', err);
    } finally {
      setIsCreating(false);
    }
  }, [projectPath, projectName, upsertAndSetCurrentProject]);

  const handleSelectProject = useCallback(
    async (project: Project) => {
      try {
        const result = await initializeProject(project.path);
        if (!result.success) {
          logger.warn('Project init failed for', project.path, result.error);
        }
      } catch {
        // Non-fatal: project directory might not exist but we still set it
      }
      setCurrentProject(project);
    },
    [setCurrentProject]
  );

  return (
    <div className="flex-1 flex items-center justify-center bg-background">
      <div className="max-w-lg w-full px-6">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2 text-foreground">Welcome to UniAI Chat</h2>
          <p className="text-muted-foreground">
            Select an existing project or create a new one to start chatting.
          </p>
        </div>

        {/* Existing projects */}
        {projects.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Recent Projects</h3>
            <div className="space-y-1">
              {projects.slice(0, 8).map((project) => {
                const Icon = getProjectIcon(project);
                const hasCustomIcon = !!project.customIconPath;
                return (
                  <button
                    key={project.id}
                    onClick={() => handleSelectProject(project)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground/80 hover:bg-accent hover:text-foreground transition-colors border border-transparent hover:border-border"
                    style={{
                      borderLeft: project.badgeColor
                        ? `3px solid ${project.badgeColor}`
                        : undefined,
                    }}
                  >
                    {hasCustomIcon ? (
                      <img
                        src={getAuthenticatedImageUrl(project.customIconPath!, project.path)}
                        alt=""
                        className="w-4 h-4 rounded object-cover shrink-0"
                      />
                    ) : (
                      <Icon
                        className="w-4 h-4 shrink-0"
                        style={{
                          color: project.iconColor || project.badgeColor || undefined,
                        }}
                      />
                    )}
                    <span className="truncate flex-1 text-left font-medium">{project.name}</span>
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {project.path}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Create new project */}
        {!showCreateForm ? (
          <div className="text-center">
            <Button onClick={() => setShowCreateForm(true)} className="gap-2" variant="outline">
              <Plus className="w-4 h-4" />
              Create New Project
            </Button>
          </div>
        ) : (
          <div className="border border-border rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-medium">New Project</h3>
            <div className="space-y-2">
              <Label htmlFor="project-name" className="text-xs">
                Project Name
              </Label>
              <Input
                id="project-name"
                placeholder="My Project"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-path" className="text-xs">
                Project Path
              </Label>
              <Input
                id="project-path"
                placeholder="/path/to/project"
                value={projectPath}
                onChange={(e) => setProjectPath(e.target.value)}
                className="h-9"
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowCreateForm(false);
                  setError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreateProject}
                disabled={isCreating || !projectPath.trim() || !projectName.trim()}
              >
                {isCreating ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
