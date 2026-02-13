/**
 * Agent Prompts Selector
 *
 * A dropdown/dialog component for selecting, adding, editing, and deleting
 * custom agent prompts that are prepended to messages.
 */

import { memo, useState, useEffect } from 'react';
import { Bot, Plus, Pencil, Trash2, FolderOpen, X, ChevronDown, Copy, Check } from 'lucide-react';
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
import { useAgentPromptsStore, type AgentPrompt } from '@/store/agent-prompts-store';
import { getElectronAPI } from '@/lib/electron';
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
    prompts,
    selectedPromptIds,
    isLoading,
    error,
    setProjectPath,
    loadPrompts,
    addPrompt,
    updatePrompt,
    deletePrompt,
    togglePromptSelection,
    clearSelection,
  } = useAgentPromptsStore();

  const [isOpen, setIsOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<AgentPrompt | null>(null);
  const [editorName, setEditorName] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorError, setEditorError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hoveredPromptId, setHoveredPromptId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sync project path with store
  useEffect(() => {
    setProjectPath(projectPath);
  }, [projectPath, setProjectPath]);

  // Get selected prompts count
  const selectedCount = selectedPromptIds.length;

  // Get button label
  const getButtonLabel = () => {
    if (selectedCount === 0) return 'Agent';
    if (selectedCount === 1) {
      const prompt = prompts.find((p) => p.id === selectedPromptIds[0]);
      return prompt?.name || 'Agent';
    }
    return `${selectedCount} Agents`;
  };

  // Open editor for new prompt
  const handleAddNew = () => {
    setEditingPrompt(null);
    setEditorName('');
    setEditorContent('');
    setEditorError(null);
    setIsEditorOpen(true);
  };

  // Open editor for existing prompt
  const handleEdit = (prompt: AgentPrompt, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPrompt(prompt);
    setEditorName(prompt.name);
    setEditorContent(prompt.prompt);
    setEditorError(null);
    setIsEditorOpen(true);
  };

  // Handle delete
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this agent prompt?')) return;
    await deletePrompt(id);
  };

  // Save prompt (add or update)
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
          editorContent.trim()
        );
        if (!success) {
          setEditorError(useAgentPromptsStore.getState().error || 'Failed to update prompt');
          return;
        }
      } else {
        const result = await addPrompt(editorName.trim(), editorContent.trim());
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

  // Open agents folder - copies path to clipboard
  const handleOpenFolder = async () => {
    if (!projectPath) return;
    try {
      const api = getElectronAPI();
      const agentsDir = `${projectPath}/.automaker/agents`;
      // Ensure directory exists
      const exists = await api.exists(agentsDir);
      if (!exists) {
        await api.mkdir(agentsDir);
      }
      // Copy path to clipboard since shell.openPath may not be available
      await navigator.clipboard.writeText(agentsDir);
      // Show feedback (reuse copiedId state)
      setCopiedId('folder');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to open agents folder:', err);
    }
  };

  // Copy prompt content
  const handleCopy = async (prompt: AgentPrompt, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(prompt.prompt);
      setCopiedId(prompt.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <>
      {/* Main Dropdown */}
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || !projectPath}
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
          className="w-80 p-0"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {/* Header */}
          <div className="p-3 border-b border-border">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-medium text-sm">Select Agent Prompt</h4>
              <Badge variant="secondary" className="text-xs">
                Workspace Files
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Select prompts to prepend to every message.
            </p>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              Stored in: .automaker/agents/
            </p>
          </div>

          {/* Actions */}
          <div className="p-2 border-b border-border flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={handleOpenFolder}
              title="Copy folder path to clipboard"
            >
              {copiedId === 'folder' ? (
                <>
                  <Check className="w-3 h-3 mr-1" />
                  Path Copied
                </>
              ) : (
                <>
                  <FolderOpen className="w-3 h-3 mr-1" />
                  Copy Path
                </>
              )}
            </Button>
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

          {/* Add New Button */}
          <div
            className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer border-b border-border"
            onClick={handleAddNew}
          >
            <div className="w-4 h-4 flex items-center justify-center">
              <Plus className="w-4 h-4 text-primary" />
            </div>
            <div>
              <span className="text-sm font-medium text-primary">Add Custom Agent</span>
              <p className="text-xs text-muted-foreground">Create your own agent prompt</p>
            </div>
          </div>

          {/* Prompts List */}
          <ScrollArea className="max-h-64">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
            ) : error ? (
              <div className="p-4 text-center text-sm text-destructive">{error}</div>
            ) : prompts.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No agent prompts yet. Click "Add Custom Agent" to create one.
              </div>
            ) : (
              prompts.map((prompt) => (
                <div
                  key={prompt.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer group"
                  onClick={() => togglePromptSelection(prompt.id)}
                  onMouseEnter={() => setHoveredPromptId(prompt.id)}
                  onMouseLeave={() => setHoveredPromptId(null)}
                >
                  <Checkbox checked={selectedPromptIds.includes(prompt.id)} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium block truncate">{prompt.name}</span>
                    <p className="text-xs text-muted-foreground truncate">
                      {prompt.prompt.substring(0, 60)}
                      {prompt.prompt.length > 60 ? '...' : ''}
                    </p>
                  </div>
                  {/* Action buttons on hover */}
                  <div
                    className={cn(
                      'flex items-center gap-1 transition-opacity',
                      hoveredPromptId === prompt.id ? 'opacity-100' : 'opacity-0'
                    )}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => handleCopy(prompt, e)}
                      title="Copy prompt"
                    >
                      {copiedId === prompt.id ? (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => handleEdit(prompt, e)}
                      title="Edit prompt"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={(e) => handleDelete(prompt.id, e)}
                      title="Delete prompt"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </ScrollArea>
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
