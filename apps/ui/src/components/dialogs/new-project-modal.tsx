import { useState, useEffect } from 'react';
import { createLogger } from '@automaker/utils/logger';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { HotkeyButton } from '@/components/ui/hotkey-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  FolderPlus,
  FolderOpen,
  Rocket,
  ExternalLink,
  Check,
  Link,
  Folder,
  FolderInput,
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { starterTemplates, type StarterTemplate } from '@/lib/templates';
import { getElectronAPI } from '@/lib/electron';
import { cn } from '@/lib/utils';
import { useFileBrowser } from '@/contexts/file-browser-context';
import { getDefaultWorkspaceDirectory, saveLastProjectDirectory } from '@/lib/workspace-config';

const logger = createLogger('NewProjectModal');

type ModalTab = 'existing' | 'blank' | 'template';

interface ValidationErrors {
  projectName?: boolean;
  workspaceDir?: boolean;
  templateSelection?: boolean;
  customUrl?: boolean;
  existingFolder?: boolean;
}

interface NewProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateBlankProject: (projectName: string, parentDir: string) => Promise<void>;
  onCreateFromTemplate: (
    template: StarterTemplate,
    projectName: string,
    parentDir: string
  ) => Promise<void>;
  onCreateFromCustomUrl: (repoUrl: string, projectName: string, parentDir: string) => Promise<void>;
  /** Callback when user wants to open an existing folder as project */
  onOpenExistingFolder?: (folderPath: string, folderName: string) => Promise<void>;
  isCreating: boolean;
}

export function NewProjectModal({
  open,
  onOpenChange,
  onCreateBlankProject,
  onCreateFromTemplate,
  onCreateFromCustomUrl,
  onOpenExistingFolder,
  isCreating,
}: NewProjectModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTab>('existing');
  const [projectName, setProjectName] = useState('');
  const [workspaceDir, setWorkspaceDir] = useState<string>('');
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<StarterTemplate | null>(null);
  const [useCustomUrl, setUseCustomUrl] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [existingFolderPath, setExistingFolderPath] = useState<string>('');
  const { openFileBrowser } = useFileBrowser();

  // Fetch workspace directory when modal opens
  useEffect(() => {
    if (open) {
      setIsLoadingWorkspace(true);
      getDefaultWorkspaceDirectory()
        .then((defaultDir) => {
          if (defaultDir) {
            setWorkspaceDir(defaultDir);
          }
        })
        .catch((error) => {
          logger.error('Failed to get default workspace directory:', error);
        })
        .finally(() => {
          setIsLoadingWorkspace(false);
        });
    }
  }, [open]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setProjectName('');
      setSelectedTemplate(null);
      setUseCustomUrl(false);
      setCustomUrl('');
      setActiveTab('existing');
      setErrors({});
      setExistingFolderPath('');
    }
  }, [open]);

  // Clear specific errors when user fixes them
  useEffect(() => {
    if (projectName && errors.projectName) {
      setErrors((prev) => ({ ...prev, projectName: false }));
    }
  }, [projectName, errors.projectName]);

  useEffect(() => {
    if ((selectedTemplate || (useCustomUrl && customUrl)) && errors.templateSelection) {
      setErrors((prev) => ({ ...prev, templateSelection: false }));
    }
  }, [selectedTemplate, useCustomUrl, customUrl, errors.templateSelection]);

  useEffect(() => {
    if (customUrl && errors.customUrl) {
      setErrors((prev) => ({ ...prev, customUrl: false }));
    }
  }, [customUrl, errors.customUrl]);

  useEffect(() => {
    if (existingFolderPath && errors.existingFolder) {
      setErrors((prev) => ({ ...prev, existingFolder: false }));
    }
  }, [existingFolderPath, errors.existingFolder]);

  const validateAndCreate = async () => {
    const newErrors: ValidationErrors = {};

    if (activeTab === 'existing') {
      // For existing folder: only need a folder selected
      if (!existingFolderPath) {
        newErrors.existingFolder = true;
      }

      if (Object.values(newErrors).some(Boolean)) {
        setErrors(newErrors);
        return;
      }

      setErrors({});
      const folderName =
        existingFolderPath.split(/[/\\]/).filter(Boolean).pop() || 'Untitled Project';

      if (onOpenExistingFolder) {
        await onOpenExistingFolder(existingFolderPath, folderName);
      }
      return;
    }

    // For blank/template tabs: need project name + workspace dir
    if (!projectName.trim()) {
      newErrors.projectName = true;
    }

    if (!workspaceDir) {
      newErrors.workspaceDir = true;
    }

    // Check template selection (only for template tab)
    if (activeTab === 'template') {
      if (useCustomUrl) {
        if (!customUrl.trim()) {
          newErrors.customUrl = true;
        }
      } else if (!selectedTemplate) {
        newErrors.templateSelection = true;
      }
    }

    // If there are errors, show them and don't proceed
    if (Object.values(newErrors).some(Boolean)) {
      setErrors(newErrors);
      return;
    }

    // Clear errors and proceed
    setErrors({});

    if (activeTab === 'blank') {
      await onCreateBlankProject(projectName, workspaceDir);
    } else if (useCustomUrl && customUrl) {
      await onCreateFromCustomUrl(customUrl, projectName, workspaceDir);
    } else if (selectedTemplate) {
      await onCreateFromTemplate(selectedTemplate, projectName, workspaceDir);
    }
  };

  const handleOpenRepo = (url: string) => {
    const api = getElectronAPI();
    api.openExternalLink(url);
  };

  const handleSelectTemplate = (template: StarterTemplate) => {
    setSelectedTemplate(template);
    setUseCustomUrl(false);
    setCustomUrl('');
  };

  const handleToggleCustomUrl = () => {
    setUseCustomUrl(!useCustomUrl);
    if (!useCustomUrl) {
      setSelectedTemplate(null);
    }
  };

  const handleBrowseDirectory = async () => {
    const selectedPath = await openFileBrowser({
      title: 'Übergeordnetes Verzeichnis wählen',
      description: 'Wähle das Verzeichnis, in dem dein Projekt erstellt wird',
      initialPath: workspaceDir || undefined,
    });
    if (selectedPath) {
      setWorkspaceDir(selectedPath);
      saveLastProjectDirectory(selectedPath);
      if (errors.workspaceDir) {
        setErrors((prev) => ({ ...prev, workspaceDir: false }));
      }
    }
  };

  const handleBrowseExistingFolder = async () => {
    const selectedPath = await openFileBrowser({
      title: 'Projekt-Ordner auswählen',
      description: 'Wähle den Ordner deines bestehenden Projekts',
      initialPath: workspaceDir || undefined,
    });
    if (selectedPath) {
      setExistingFolderPath(selectedPath);
      if (errors.existingFolder) {
        setErrors((prev) => ({ ...prev, existingFolder: false }));
      }
    }
  };

  // Use platform-specific path separator
  const pathSep =
    typeof window !== 'undefined' && window.electronAPI
      ? navigator.platform.indexOf('Win') !== -1
        ? '\\'
        : '/'
      : '/';
  const projectPath = workspaceDir && projectName ? `${workspaceDir}${pathSep}${projectName}` : '';

  // Derive button text and disabled state
  const isExistingTab = activeTab === 'existing';
  const buttonLabel = isExistingTab ? 'Projekt öffnen' : 'Projekt erstellen';
  const buttonLoadingLabel = isExistingTab
    ? 'Öffne...'
    : activeTab === 'template'
      ? 'Klone...'
      : 'Erstelle...';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-card border-border max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        data-testid="new-project-modal"
      >
        <DialogHeader className="pb-2">
          <DialogTitle className="text-foreground">Projekt hinzufügen</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Bestehenden Ordner öffnen oder ein neues Projekt erstellen.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            setActiveTab(v as ModalTab);
            setErrors({});
          }}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="w-full justify-start">
            <TabsTrigger value="existing" className="gap-2">
              <FolderInput className="w-4 h-4" />
              Bestehender Ordner
            </TabsTrigger>
            <TabsTrigger value="blank" className="gap-2">
              <FolderPlus className="w-4 h-4" />
              Leeres Projekt
            </TabsTrigger>
            <TabsTrigger value="template" className="gap-2">
              <Rocket className="w-4 h-4" />
              Starter Kit
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto py-4">
            {/* ====== TAB: Bestehender Ordner ====== */}
            <TabsContent value="existing" className="mt-0">
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <p className="text-sm text-muted-foreground mb-4">
                    Wähle einen bestehenden Projekt-Ordner aus. Der wird automatisch als Workspace
                    eingerichtet – du brauchst keinen Namen einzugeben.
                  </p>

                  {/* Folder selection area */}
                  <div
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border-2 border-dashed transition-colors cursor-pointer hover:border-brand-500/50 hover:bg-brand-500/5',
                      existingFolderPath
                        ? 'border-brand-500/40 bg-brand-500/5'
                        : errors.existingFolder
                          ? 'border-red-500/50 bg-red-500/5'
                          : 'border-border'
                    )}
                    onClick={handleBrowseExistingFolder}
                    data-testid="browse-existing-folder"
                  >
                    <div
                      className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                        existingFolderPath ? 'bg-brand-500/10' : 'bg-muted'
                      )}
                    >
                      {existingFolderPath ? (
                        <Check className="w-5 h-5 text-brand-500" />
                      ) : (
                        <FolderOpen className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {existingFolderPath ? (
                        <>
                          <p className="text-sm font-medium text-foreground truncate">
                            {existingFolderPath.split(/[/\\]/).filter(Boolean).pop()}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {existingFolderPath}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-foreground">Ordner auswählen...</p>
                          <p className="text-xs text-muted-foreground">
                            Klicke hier um einen Projekt-Ordner zu wählen
                          </p>
                        </>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBrowseExistingFolder();
                      }}
                    >
                      <FolderOpen className="w-4 h-4 mr-1" />
                      Durchsuchen
                    </Button>
                  </div>

                  {errors.existingFolder && (
                    <p className="text-xs text-red-500 mt-2">Bitte wähle einen Ordner aus</p>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ====== TAB: Leeres Projekt ====== */}
            <TabsContent value="blank" className="mt-0">
              <div className="space-y-4">
                <BlankProjectForm
                  projectName={projectName}
                  setProjectName={setProjectName}
                  workspaceDir={workspaceDir}
                  isLoadingWorkspace={isLoadingWorkspace}
                  projectPath={projectPath}
                  errors={errors}
                  onBrowseDirectory={handleBrowseDirectory}
                />
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <p className="text-sm text-muted-foreground">
                    Erstellt ein leeres Projekt mit der Standard-.automaker Verzeichnisstruktur.
                    Perfekt um von Grund auf zu starten.
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* ====== TAB: Starter Kit ====== */}
            <TabsContent value="template" className="mt-0">
              <div className="space-y-4">
                <BlankProjectForm
                  projectName={projectName}
                  setProjectName={setProjectName}
                  workspaceDir={workspaceDir}
                  isLoadingWorkspace={isLoadingWorkspace}
                  projectPath={projectPath}
                  errors={errors}
                  onBrowseDirectory={handleBrowseDirectory}
                />

                {/* Error message for template selection */}
                {errors.templateSelection && (
                  <p className="text-sm text-red-500">
                    Bitte wähle ein Template oder gib eine GitHub-URL ein
                  </p>
                )}

                {/* Preset Templates */}
                <TemplateList
                  selectedTemplate={selectedTemplate}
                  useCustomUrl={useCustomUrl}
                  customUrl={customUrl}
                  errors={errors}
                  onSelectTemplate={handleSelectTemplate}
                  onToggleCustomUrl={handleToggleCustomUrl}
                  onSetCustomUrl={setCustomUrl}
                  onOpenRepo={handleOpenRepo}
                />
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="border-t border-border pt-4">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            Abbrechen
          </Button>
          <HotkeyButton
            onClick={validateAndCreate}
            disabled={isCreating}
            className="bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-600 text-white border-0"
            hotkey={{ key: 'Enter', cmdCtrl: true }}
            hotkeyActive={open}
            data-testid="confirm-create-project"
          >
            {isCreating ? (
              <>
                <Spinner size="sm" className="mr-2" />
                {buttonLoadingLabel}
              </>
            ) : (
              <>{buttonLabel}</>
            )}
          </HotkeyButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Extracted Sub-Components ────────────────────────────────────────────────

interface BlankProjectFormProps {
  projectName: string;
  setProjectName: (name: string) => void;
  workspaceDir: string;
  isLoadingWorkspace: boolean;
  projectPath: string;
  errors: ValidationErrors;
  onBrowseDirectory: () => void;
}

/** Shared form for project name + workspace dir (used in blank + template tabs) */
function BlankProjectForm({
  projectName,
  setProjectName,
  workspaceDir,
  isLoadingWorkspace,
  projectPath,
  errors,
  onBrowseDirectory,
}: BlankProjectFormProps) {
  return (
    <div className="space-y-3 pb-4 border-b border-border">
      <div className="space-y-2">
        <Label
          htmlFor="project-name"
          className={cn('text-foreground', errors.projectName && 'text-red-500')}
        >
          Projektname {errors.projectName && <span className="text-red-500">*</span>}
        </Label>
        <Input
          id="project-name"
          placeholder="mein-tolles-projekt"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className={cn(
            'bg-input text-foreground placeholder:text-muted-foreground',
            errors.projectName
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
              : 'border-border'
          )}
          data-testid="project-name-input"
          autoFocus
        />
        {errors.projectName && <p className="text-xs text-red-500">Projektname ist erforderlich</p>}
      </div>

      {/* Workspace Directory Display */}
      <div
        className={cn(
          'flex items-start gap-2 text-sm',
          errors.workspaceDir ? 'text-red-500' : 'text-muted-foreground'
        )}
      >
        <Folder className="w-4 h-4 shrink-0 mt-0.5" />
        <span className="flex-1 min-w-0 flex flex-col gap-1">
          {isLoadingWorkspace ? (
            'Lade Arbeitsverzeichnis...'
          ) : workspaceDir ? (
            <>
              <span>Wird erstellt unter:</span>
              <code
                className="text-xs bg-muted px-1.5 py-0.5 rounded truncate block max-w-full"
                title={projectPath || workspaceDir}
              >
                {projectPath || workspaceDir}
              </code>
            </>
          ) : null}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onBrowseDirectory}
          disabled={isLoadingWorkspace}
          className="shrink-0 h-7 px-2 text-xs"
          data-testid="browse-directory-button"
        >
          <FolderOpen className="w-3.5 h-3.5 mr-1" />
          Durchsuchen
        </Button>
      </div>
    </div>
  );
}

interface TemplateListProps {
  selectedTemplate: StarterTemplate | null;
  useCustomUrl: boolean;
  customUrl: string;
  errors: ValidationErrors;
  onSelectTemplate: (template: StarterTemplate) => void;
  onToggleCustomUrl: () => void;
  onSetCustomUrl: (url: string) => void;
  onOpenRepo: (url: string) => void;
}

/** Template selector grid (used in template tab) */
function TemplateList({
  selectedTemplate,
  useCustomUrl,
  customUrl,
  errors,
  onSelectTemplate,
  onToggleCustomUrl,
  onSetCustomUrl,
  onOpenRepo,
}: TemplateListProps) {
  return (
    <div
      className={cn(
        'space-y-3 rounded-lg p-1 -m-1',
        errors.templateSelection && 'ring-2 ring-red-500/50'
      )}
    >
      {starterTemplates.map((template) => (
        <div
          key={template.id}
          className={cn(
            'p-4 rounded-lg border cursor-pointer transition-all',
            selectedTemplate?.id === template.id && !useCustomUrl
              ? 'border-brand-500 bg-brand-500/10'
              : 'border-border bg-muted/30 hover:border-border-glass hover:bg-muted/50'
          )}
          onClick={() => onSelectTemplate(template)}
          data-testid={`template-${template.id}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-foreground">{template.name}</h4>
                {selectedTemplate?.id === template.id && !useCustomUrl && (
                  <Check className="w-4 h-4 text-brand-500" />
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-3">{template.description}</p>

              {/* Tech Stack */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {template.techStack.slice(0, 6).map((tech) => (
                  <Badge key={tech} variant="secondary" className="text-xs">
                    {tech}
                  </Badge>
                ))}
                {template.techStack.length > 6 && (
                  <Badge variant="secondary" className="text-xs">
                    +{template.techStack.length - 6} more
                  </Badge>
                )}
              </div>

              {/* Key Features */}
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Features: </span>
                {template.features.slice(0, 3).join(' · ')}
                {template.features.length > 3 && ` · +${template.features.length - 3} more`}
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onOpenRepo(template.repoUrl);
              }}
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              View
            </Button>
          </div>
        </div>
      ))}

      {/* Custom URL Option */}
      <div
        className={cn(
          'p-4 rounded-lg border cursor-pointer transition-all',
          useCustomUrl
            ? 'border-brand-500 bg-brand-500/10'
            : 'border-border bg-muted/30 hover:border-border-glass hover:bg-muted/50'
        )}
        onClick={onToggleCustomUrl}
      >
        <div className="flex items-center gap-2 mb-2">
          <Link className="w-4 h-4 text-muted-foreground" />
          <h4 className="font-medium text-foreground">Eigene GitHub-URL</h4>
          {useCustomUrl && <Check className="w-4 h-4 text-brand-500" />}
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Beliebiges öffentliches GitHub-Repository als Startpunkt klonen.
        </p>

        {useCustomUrl && (
          <div onClick={(e) => e.stopPropagation()} className="space-y-1">
            <Input
              placeholder="https://github.com/username/repository"
              value={customUrl}
              onChange={(e) => onSetCustomUrl(e.target.value)}
              className={cn(
                'bg-input text-foreground placeholder:text-muted-foreground',
                errors.customUrl
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                  : 'border-border'
              )}
              data-testid="custom-url-input"
            />
            {errors.customUrl && (
              <p className="text-xs text-red-500">GitHub-URL ist erforderlich</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
