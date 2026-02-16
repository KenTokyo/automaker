/**
 * Agent Prompts Selector
 *
 * A dropdown/dialog component for selecting, adding, editing, and deleting
 * custom agent prompts that are prepended to messages.
 * Supports two scopes: Global (available in all projects) and Project (local).
 */

import { memo, useState, useEffect } from 'react';
import {
  Bot,
  Plus,
  Pencil,
  Trash2,
  Globe,
  FolderOpen,
  ChevronDown,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  useAgentPromptsStore,
  getPromptKey,
  type AgentPrompt,
  type AgentPromptScope,
} from '@/store/agent-prompts-store';
import { Badge } from '@/components/ui/badge';

interface AgentPromptsSelectorProps {
  projectPath: string | null;
  disabled?: boolean;
}

export const AgentPromptsSelector = memo(function AgentPromptsSelector({
  projectPath,
  disabled,
}: AgentPromptsSelectorProps) {
  const {
    globalPrompts,
    localPrompts,
    selectedPromptKeys,
    isLoading,
    error,
    setProjectPath,
    addPrompt,
    updatePrompt,
    deletePrompt,
    togglePromptSelection,
    clearSelection,
    isSelected,
  } = useAgentPromptsStore();

  const [isOpen, setIsOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<AgentPrompt | null>(null);
  const [editorName, setEditorName] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorScope, setEditorScope] = useState<AgentPromptScope>('local');
  const [editorError, setEditorError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sync project path with store
  useEffect(() => {
    setProjectPath(projectPath);
  }, [projectPath, setProjectPath]);

  const selectedCount = selectedPromptKeys.length;
  const allPrompts = [...globalPrompts, ...localPrompts];
  const hasAnyPrompts = allPrompts.length > 0;

  const getButtonLabel = () => {
    if (selectedCount === 0) return 'Agent';
    if (selectedCount === 1) {
      const prompt = allPrompts.find((p) =>
        selectedPromptKeys.includes(getPromptKey(p.scope, p.id))
      );
      return prompt?.name || 'Agent';
    }
    return `${selectedCount} Agents`;
  };

  const handleAddNew = (scope: AgentPromptScope = 'local') => {
    setEditingPrompt(null);
    setEditorName('');
    setEditorContent('');
    setEditorScope(scope);
    setEditorError(null);
    setIsEditorOpen(true);
  };

  const handleEdit = (prompt: AgentPrompt, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPrompt(prompt);
    setEditorName(prompt.name);
    setEditorContent(prompt.prompt);
    setEditorScope(prompt.scope);
    setEditorError(null);
    setIsEditorOpen(true);
  };

  const handleDelete = async (prompt: AgentPrompt, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this agent prompt?')) return;
    await deletePrompt(prompt.id, prompt.scope);
  };

  const handleSave = async () => {
    if (!editorName.trim()) {
      setEditorError('Name is required');
      return;
    }
    if (!editorContent.trim()) {
      setEditorError('Prompt content is required');
      return;
    }

    setIsSaving(true);
    setEditorError(null);

    try {
      if (editingPrompt) {
        const success = await updatePrompt(
          editingPrompt.id,
          editorName.trim(),
          editorContent.trim(),
          editingPrompt.scope
        );
        if (!success) {
          setEditorError(useAgentPromptsStore.getState().error || 'Failed to update prompt');
          return;
        }
      } else {
        const result = await addPrompt(editorName.trim(), editorContent.trim(), editorScope);
        if (!result) {
          setEditorError(useAgentPromptsStore.getState().error || 'Failed to add prompt');
          return;
        }
      }
      setIsEditorOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = async (prompt: AgentPrompt, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(prompt.prompt);
      setCopiedId(getPromptKey(prompt.scope, prompt.id));
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const renderPromptItem = (prompt: AgentPrompt) => {
    const key = getPromptKey(prompt.scope, prompt.id);
    const checked = isSelected(prompt.id, prompt.scope);

    return (
      <div
        key={key}
        className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer group"
        onClick={() => togglePromptSelection(prompt.id, prompt.scope)}
        onMouseEnter={() => setHoveredKey(key)}
        onMouseLeave={() => setHoveredKey(null)}
      >
        <Checkbox checked={checked} />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium block truncate">{prompt.name}</span>
          <p className="text-xs text-muted-foreground truncate">
            {prompt.prompt.substring(0, 40)}
            {prompt.prompt.length > 40 ? '...' : ''}
          </p>
        </div>
        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={(e) => handleCopy(prompt, e)}
            title="Copy prompt"
          >
            {copiedId === key ? (
              <Check className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={(e) => handleEdit(prompt, e)}
            title="Edit prompt"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={(e) => handleDelete(prompt, e)}
            title="Delete prompt"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Main Dropdown */}
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className={cn(
              'h-11 px-3 rounded-xl border-border gap-1.5',
              selectedCount > 0 && 'border-primary/30 text-primary bg-primary/5'
            )}
          >
            <Bot className="w-4 h-4" />
            <span className="hidden sm:inline">{getButtonLabel()}</span>
            <ChevronDown className="w-3 h-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          className="w-96 p-0"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {/* Header */}
          <div className="p-3 border-b border-border">
            <h4 className="font-medium text-sm mb-1">Select Agent Prompt</h4>
            <p className="text-xs text-muted-foreground">
              Select prompts to prepend to every message.
            </p>
          </div>

          {/* Clear All Option */}
          <div
            className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer border-b border-border"
            onClick={() => clearSelection()}
          >
            <Checkbox checked={selectedCount === 0} />
            <div>
              <span className="text-sm font-medium">None (Clear All)</span>
              <p className="text-xs text-muted-foreground">Deselect all agent prompts</p>
            </div>
          </div>

          {/* Prompts List with Scope Groups */}
          <ScrollArea className="max-h-72">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
            ) : error ? (
              <div className="p-4 text-center text-sm text-destructive">{error}</div>
            ) : !hasAnyPrompts ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No agent prompts yet. Add one below.
              </div>
            ) : (
              <>
                {/* Global Prompts Section */}
                {globalPrompts.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 border-b border-border">
                      <Globe className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-xs font-medium text-muted-foreground">
                        Global Agents
                      </span>
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 h-4 ml-auto bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      >
                        {globalPrompts.length}
                      </Badge>
                    </div>
                    {globalPrompts.map(renderPromptItem)}
                  </>
                )}

                {/* Project Prompts Section */}
                {localPrompts.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 border-b border-border">
                      <FolderOpen className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-medium text-muted-foreground">
                        Project Agents
                      </span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 ml-auto">
                        {localPrompts.length}
                      </Badge>
                    </div>
                    {localPrompts.map(renderPromptItem)}
                  </>
                )}
              </>
            )}
          </ScrollArea>

          {/* Add New Buttons */}
          <div className="border-t border-border">
            <div
              className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer"
              onClick={() => handleAddNew('global')}
            >
              <div className="w-4 h-4 flex items-center justify-center">
                <Plus className="w-4 h-4 text-blue-500" />
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  Add Global Agent
                </span>
                <p className="text-xs text-muted-foreground">Available in all projects</p>
              </div>
              <Globe className="w-3.5 h-3.5 text-blue-500/50" />
            </div>
            {projectPath && (
              <div
                className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer"
                onClick={() => handleAddNew('local')}
              >
                <div className="w-4 h-4 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-primary">Add Project Agent</span>
                  <p className="text-xs text-muted-foreground">Only in this project</p>
                </div>
                <FolderOpen className="w-3.5 h-3.5 text-primary/50" />
              </div>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPrompt ? 'Edit Agent Prompt' : 'Add Custom Agent'}</DialogTitle>
            <DialogDescription>
              {editingPrompt
                ? 'Modify the agent prompt details below.'
                : 'Create a new agent prompt that will be prepended to your messages.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Scope indicator */}
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Scope:</Label>
              {editingPrompt ? (
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-xs',
                    editingPrompt.scope === 'global'
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                      : ''
                  )}
                >
                  {editingPrompt.scope === 'global' ? (
                    <>
                      <Globe className="w-3 h-3 mr-1" />
                      Global
                    </>
                  ) : (
                    <>
                      <FolderOpen className="w-3 h-3 mr-1" />
                      Project
                    </>
                  )}
                </Badge>
              ) : (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={editorScope === 'global' ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      'h-7 text-xs',
                      editorScope === 'global' && 'bg-blue-500 hover:bg-blue-600 text-white'
                    )}
                    onClick={() => setEditorScope('global')}
                  >
                    <Globe className="w-3 h-3 mr-1" />
                    Global
                  </Button>
                  <Button
                    type="button"
                    variant={editorScope === 'local' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setEditorScope('local')}
                    disabled={!projectPath}
                  >
                    <FolderOpen className="w-3 h-3 mr-1" />
                    Project
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-name">Name</Label>
              <Input
                id="agent-name"
                placeholder="e.g., Code Reviewer"
                value={editorName}
                onChange={(e) => setEditorName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-prompt">Prompt</Label>
              <Textarea
                id="agent-prompt"
                placeholder="Enter the agent prompt instructions..."
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                rows={8}
                className="resize-none"
              />
            </div>

            {editorError && <p className="text-sm text-destructive">{editorError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditorOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : editingPrompt ? 'Save Changes' : 'Add Agent'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});
