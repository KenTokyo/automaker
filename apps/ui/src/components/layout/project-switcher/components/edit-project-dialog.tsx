import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, ImageIcon, Check } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { getAuthenticatedImageUrl } from '@/lib/api-fetch';
import { getHttpApiClient } from '@/lib/http-api-client';
import type { Project } from '@/lib/electron';
import { IconPicker } from './icon-picker';
import { cn } from '@/lib/utils';

/** Predefined badge colors for quick selection */
const BADGE_COLORS = [
  { value: '#ef4444', label: 'Red' },
  { value: '#f97316', label: 'Orange' },
  { value: '#eab308', label: 'Yellow' },
  { value: '#22c55e', label: 'Green' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
];

interface EditProjectDialogProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProjectDialog({ project, open, onOpenChange }: EditProjectDialogProps) {
  const { setProjectName, setProjectIcon, setProjectCustomIcon, setProjectBadgeColor } =
    useAppStore();
  const [name, setName] = useState(project.name);
  const [icon, setIcon] = useState<string | null>((project as any).icon || null);
  const [customIconPath, setCustomIconPath] = useState<string | null>(
    (project as any).customIconPath || null
  );
  const [badgeColor, setBadgeColor] = useState<string | null>((project as any).badgeColor || null);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    if (name.trim() !== project.name) {
      setProjectName(project.id, name.trim());
    }
    if (icon !== (project as any).icon) {
      setProjectIcon(project.id, icon);
    }
    if (customIconPath !== (project as any).customIconPath) {
      setProjectCustomIcon(project.id, customIconPath);
    }
    if (badgeColor !== (project as any).badgeColor) {
      setProjectBadgeColor(project.id, badgeColor);
    }
    onOpenChange(false);
  };

  const handleCustomIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return;
    }

    // Validate file size (max 2MB for icons)
    if (file.size > 2 * 1024 * 1024) {
      return;
    }

    setIsUploadingIcon(true);
    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        const result = await getHttpApiClient().saveImageToTemp(
          base64Data,
          `project-icon-${file.name}`,
          file.type,
          project.path
        );
        if (result.success && result.path) {
          setCustomIconPath(result.path);
          // Clear the Lucide icon when custom icon is set
          setIcon(null);
        }
        setIsUploadingIcon(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setIsUploadingIcon(false);
    }
  };

  const handleRemoveCustomIcon = () => {
    setCustomIconPath(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto flex-1 min-h-0">
          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter project name"
            />
          </div>

          {/* Icon Picker */}
          <div className="space-y-2">
            <Label>Project Icon</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Choose a preset icon or upload a custom image
            </p>

            {/* Custom Icon Upload */}
            <div className="mb-4">
              <div className="flex items-center gap-3">
                {customIconPath ? (
                  <div className="relative">
                    <img
                      src={getAuthenticatedImageUrl(customIconPath, project.path)}
                      alt="Custom project icon"
                      className="w-12 h-12 rounded-lg object-cover border border-border"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveCustomIcon}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-lg border border-dashed border-border flex items-center justify-center bg-accent/30">
                    <ImageIcon className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleCustomIconUpload}
                    className="hidden"
                    id="custom-icon-upload-dialog"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingIcon}
                    className="gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {isUploadingIcon ? 'Uploading...' : 'Upload Custom Icon'}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG, GIF or WebP. Max 2MB.
                  </p>
                </div>
              </div>
            </div>

            {/* Preset Icon Picker - only show if no custom icon */}
            {!customIconPath && <IconPicker selectedIcon={icon} onSelectIcon={setIcon} />}
          </div>

          {/* Badge Color Picker */}
          <div className="space-y-2">
            <Label>Badge Border Color</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Add a colored border to distinguish this project
            </p>
            <div className="flex flex-wrap gap-2">
              {/* No color option */}
              <button
                type="button"
                onClick={() => setBadgeColor(null)}
                className={cn(
                  'w-7 h-7 rounded-md border-2 flex items-center justify-center transition-all',
                  badgeColor === null
                    ? 'border-primary ring-2 ring-primary/30'
                    : 'border-border hover:border-muted-foreground'
                )}
                title="No border"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              {/* Predefined colors */}
              {BADGE_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setBadgeColor(color.value)}
                  className={cn(
                    'w-7 h-7 rounded-md border-2 flex items-center justify-center transition-all',
                    badgeColor === color.value ? 'ring-2 ring-primary/30' : 'hover:scale-110'
                  )}
                  style={{
                    backgroundColor: color.value,
                    borderColor: badgeColor === color.value ? 'hsl(var(--primary))' : color.value,
                  }}
                  title={color.label}
                >
                  {badgeColor === color.value && (
                    <Check className="w-3.5 h-3.5 text-white drop-shadow-sm" />
                  )}
                </button>
              ))}
            </div>
            {/* Preview */}
            {badgeColor && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Preview:</span>
                <span
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
                  style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: badgeColor }}
                >
                  {name || project.name}
                </span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
