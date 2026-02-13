import { memo, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Templates
const TEMPLATES = {
  empty: {
    label: 'Empty Document',
    content: '',
  },
  plan: {
    label: 'Planning Template',
    content: `# [Title]

## Overview
[Brief description]

## Goals
- [ ] Goal 1
- [ ] Goal 2

## Phases

### Phase 1: [Name]
- [ ] Task 1
- [ ] Task 2

### Phase 2: [Name]
- [ ] Task 1
- [ ] Task 2

## Notes
[Additional notes here]
`,
  },
  feature: {
    label: 'Feature Spec Template',
    content: `# Feature: [Name]

## Description
[What should this feature do?]

## Requirements
- [ ] Requirement 1
- [ ] Requirement 2

## Technical Details
[How should it be implemented?]

## Affected Files
| File | Change |
|------|--------|
| \`file.ts\` | Description |

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
`,
  },
  meeting: {
    label: 'Meeting Notes Template',
    content: `# Meeting: [Topic]
**Date**: [YYYY-MM-DD]
**Attendees**: [Names]

## Agenda
1. [Item 1]
2. [Item 2]

## Notes
[Notes here]

## Action Items
- [ ] [Person] - [Task] - [Deadline]
`,
  },
} as const;

type TemplateKey = keyof typeof TEMPLATES;

const VALID_FILENAME_REGEX = /^[a-zA-Z0-9_\-][a-zA-Z0-9_\-. ]*$/;

interface DocsCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string, content: string) => Promise<void>;
  subfolder?: string;
}

export const DocsCreateDialog = memo(function DocsCreateDialog({
  open,
  onOpenChange,
  onSubmit,
}: DocsCreateDialogProps) {
  const [fileName, setFileName] = useState('');
  const [extension, setExtension] = useState('.md');
  const [template, setTemplate] = useState<TemplateKey>('empty');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateFileName = useCallback((name: string): string | null => {
    if (!name.trim()) return 'Filename is required';
    if (name.length > 255) return 'Filename too long (max 255 characters)';
    if (name.startsWith('.')) return 'Filename cannot start with a dot';
    if (!VALID_FILENAME_REGEX.test(name)) {
      return 'Only letters, numbers, hyphens, underscores, spaces, and dots allowed';
    }
    return null;
  }, []);

  const handleSubmit = useCallback(async () => {
    const validationError = validateFileName(fileName);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const fullName = fileName + extension;
      const content = TEMPLATES[template].content;
      await onSubmit(fullName, content);
      // Reset form on success
      setFileName('');
      setExtension('.md');
      setTemplate('empty');
      onOpenChange(false);
    } catch (err) {
      if (err instanceof Error && err.message.includes('already exists')) {
        setError('A file with this name already exists');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to create document');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [fileName, extension, template, validateFileName, onSubmit, onOpenChange]);

  const handleFileNameChange = useCallback(
    (value: string) => {
      setFileName(value);
      if (error) setError(null);
    },
    [error]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Document</DialogTitle>
          <DialogDescription>Create a new document in your project docs.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Filename input + extension selector */}
          <div className="space-y-2">
            <Label htmlFor="doc-filename">Filename</Label>
            <div className="flex gap-2">
              <Input
                id="doc-filename"
                placeholder="my-document"
                value={fileName}
                onChange={(e) => handleFileNameChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmit();
                }}
                autoFocus
                className="flex-1"
              />
              <Select value={extension} onValueChange={setExtension}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=".md">.md</SelectItem>
                  <SelectItem value=".txt">.txt</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          {/* Template selection */}
          <div className="space-y-2">
            <Label>Template (optional)</Label>
            <RadioGroup
              value={template}
              onValueChange={(value) => setTemplate(value as TemplateKey)}
              className="space-y-1"
            >
              {(Object.entries(TEMPLATES) as [TemplateKey, (typeof TEMPLATES)[TemplateKey]][]).map(
                ([key, tmpl]) => (
                  <div key={key} className="flex items-center gap-2">
                    <RadioGroupItem value={key} id={`template-${key}`} />
                    <Label htmlFor={`template-${key}`} className="font-normal cursor-pointer">
                      {tmpl.label}
                    </Label>
                  </div>
                )
              )}
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !fileName.trim()}>
            {isSubmitting ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

// Folder creation dialog
interface DocsFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => Promise<void>;
}

export const DocsFolderDialog = memo(function DocsFolderDialog({
  open,
  onOpenChange,
  onSubmit,
}: DocsFolderDialogProps) {
  const [folderName, setFolderName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!folderName.trim()) {
      setError('Folder name is required');
      return;
    }
    if (folderName.startsWith('.')) {
      setError('Folder name cannot start with a dot');
      return;
    }
    if (!VALID_FILENAME_REGEX.test(folderName)) {
      setError('Only letters, numbers, hyphens, underscores, spaces, and dots allowed');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(folderName);
      setFolderName('');
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create folder');
    } finally {
      setIsSubmitting(false);
    }
  }, [folderName, onSubmit, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New Folder</DialogTitle>
          <DialogDescription>Create a new folder in your docs.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="folder-name">Folder name</Label>
          <Input
            id="folder-name"
            placeholder="my-folder"
            value={folderName}
            onChange={(e) => {
              setFolderName(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
            autoFocus
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !folderName.trim()}>
            {isSubmitting ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

// Delete confirmation dialog
interface DocsDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  isDirectory: boolean;
  onConfirm: () => Promise<void>;
}

export const DocsDeleteDialog = memo(function DocsDeleteDialog({
  open,
  onOpenChange,
  fileName,
  isDirectory,
  onConfirm,
}: DocsDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = useCallback(async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      // Error handled upstream via toast
    } finally {
      setIsDeleting(false);
    }
  }, [onConfirm, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete {isDirectory ? 'Folder' : 'Document'}?</DialogTitle>
          <DialogDescription>
            {isDirectory
              ? `Delete folder "${fileName}" and all its contents? This action cannot be undone.`
              : `Delete "${fileName}"? This action cannot be undone.`}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
