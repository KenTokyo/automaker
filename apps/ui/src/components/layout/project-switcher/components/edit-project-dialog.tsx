import { useState, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, ImageIcon, Check, Folder, Palette } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { getAuthenticatedImageUrl } from '@/lib/api-fetch';
import { getHttpApiClient } from '@/lib/http-api-client';
import type { Project } from '@/lib/electron';
import { IconPicker } from './icon-picker';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

/** Predefined colors for quick selection */
const PROJECT_COLORS = [
  { value: '#ef4444', label: 'Red' },
  { value: '#f97316', label: 'Orange' },
  { value: '#eab308', label: 'Yellow' },
  { value: '#22c55e', label: 'Green' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#f43f5e', label: 'Rose' },
  { value: '#14b8a6', label: 'Teal' },
  { value: '#84cc16', label: 'Lime' },
  { value: '#a855f7', label: 'Violet' },
];

/** Background colors with transparency options */
const BACKGROUND_COLORS = [
  { value: '#ef444420', label: 'Red (subtle)' },
  { value: '#f9731620', label: 'Orange (subtle)' },
  { value: '#eab30820', label: 'Yellow (subtle)' },
  { value: '#22c55e20', label: 'Green (subtle)' },
  { value: '#06b6d420', label: 'Cyan (subtle)' },
  { value: '#3b82f620', label: 'Blue (subtle)' },
  { value: '#8b5cf620', label: 'Purple (subtle)' },
  { value: '#ec489920', label: 'Pink (subtle)' },
  { value: '#ef4444', label: 'Red' },
  { value: '#f97316', label: 'Orange' },
  { value: '#eab308', label: 'Yellow' },
  { value: '#22c55e', label: 'Green' },
];

interface ColorPickerProps {
  value: string | null;
  onChange: (color: string | null) => void;
  colors: Array<{ value: string; label: string }>;
  label: string;
  allowNone?: boolean;
}

function ColorPicker({ value, onChange, colors, label, allowNone = true }: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {allowNone && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className={cn(
            'w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all',
            value === null
              ? 'border-primary ring-2 ring-primary/30'
              : 'border-border hover:border-muted-foreground'
          )}
          title={`No ${label}`}
        >
          <X className="w-3 h-3 text-muted-foreground" />
        </button>
      )}
      {colors.map((color) => (
        <button
          key={color.value}
          type="button"
          onClick={() => onChange(color.value)}
          className={cn(
            'w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all',
            value === color.value ? 'ring-2 ring-primary/30' : 'hover:scale-110'
          )}
          style={{
            backgroundColor: color.value,
            borderColor: value === color.value ? 'hsl(var(--primary))' : color.value,
          }}
          title={color.label}
        >
          {value === color.value && (
            <Check
              className="w-3 h-3 drop-shadow-sm"
              style={{ color: isLightColor(color.value) ? '#000' : '#fff' }}
            />
          )}
        </button>
      ))}
    </div>
  );
}

/** Check if a color is light (for contrast purposes) */
function isLightColor(hex: string): boolean {
  // Remove # and alpha channel if present
  const cleanHex = hex.replace('#', '').slice(0, 6);
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

interface EditProjectDialogProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProjectDialog({ project, open, onOpenChange }: EditProjectDialogProps) {
  const {
    setProjectName,
    setProjectIcon,
    setProjectCustomIcon,
    setProjectBadgeColor,
    setProjectBackgroundColor,
    setProjectTextColor,
    setProjectIconColor,
    setProjectChatBackgroundColor,
  } = useAppStore();
  const [name, setName] = useState(project.name);
  const [icon, setIcon] = useState<string | null>(project.icon || null);
  const [customIconPath, setCustomIconPath] = useState<string | null>(
    project.customIconPath || null
  );
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Read appearance values directly from project (auto-save)
  const badgeColor = project.badgeColor || null;
  const backgroundColor = project.backgroundColor || null;
  const textColor = project.textColor || null;
  const iconColor = project.iconColor || null;
  const chatBackgroundColor = project.chatBackgroundColor || null;

  // Get the icon component for preview
  const getIconComponent = (): LucideIcon => {
    if (icon && icon in LucideIcons) {
      return (LucideIcons as unknown as Record<string, LucideIcon>)[icon];
    }
    return Folder;
  };
  const IconComponent = getIconComponent();

  const handleSave = async () => {
    let hasChanges = false;
    if (name.trim() !== project.name) {
      setProjectName(project.id, name.trim());
      hasChanges = true;
    }
    if (icon !== (project.icon ?? null)) {
      setProjectIcon(project.id, icon);
      hasChanges = true;
    }
    if (customIconPath !== (project.customIconPath ?? null)) {
      setProjectCustomIcon(project.id, customIconPath);
      hasChanges = true;
    }
    onOpenChange(false);
    // Persist all project changes to server in one batch
    if (hasChanges) {
      const { syncSettingsToServer } = await import('@/hooks/use-settings-migration');
      await syncSettingsToServer();
    }
  };

  // Auto-save appearance handlers
  const handleBadgeColorChange = async (color: string | null) => {
    setProjectBadgeColor(project.id, color);
    const { syncSettingsToServer } = await import('@/hooks/use-settings-migration');
    await syncSettingsToServer();
  };

  const handleBackgroundColorChange = async (color: string | null) => {
    setProjectBackgroundColor(project.id, color);
    const { syncSettingsToServer } = await import('@/hooks/use-settings-migration');
    await syncSettingsToServer();
  };

  const handleTextColorChange = async (color: string | null) => {
    setProjectTextColor(project.id, color);
    const { syncSettingsToServer } = await import('@/hooks/use-settings-migration');
    await syncSettingsToServer();
  };

  const handleIconColorChange = async (color: string | null) => {
    setProjectIconColor(project.id, color);
    const { syncSettingsToServer } = await import('@/hooks/use-settings-migration');
    await syncSettingsToServer();
  };

  const handleChatBackgroundColorChange = async (color: string | null) => {
    setProjectChatBackgroundColor(project.id, color);
    const { syncSettingsToServer } = await import('@/hooks/use-settings-migration');
    await syncSettingsToServer();
  };

  const handleCustomIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error(
        `Invalid file type: ${file.type || 'unknown'}. Please use JPG, PNG, GIF or WebP.`
      );
      return;
    }

    // Validate file size (max 5MB for icons - allows animated GIFs)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(
        `File too large (${(file.size / 1024 / 1024).toFixed(2)} MB). Maximum size is 5 MB.`
      );
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
          toast.success('Icon uploaded successfully');
        } else {
          toast.error('Failed to upload icon');
        }
        setIsUploadingIcon(false);
      };
      reader.onerror = () => {
        toast.error('Failed to read file');
        setIsUploadingIcon(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error('Failed to upload icon');
      setIsUploadingIcon(false);
    }
  };

  const handleRemoveCustomIcon = () => {
    setCustomIconPath(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleResetColors = async () => {
    setProjectBadgeColor(project.id, null);
    setProjectBackgroundColor(project.id, null);
    setProjectTextColor(project.id, null);
    setProjectIconColor(project.id, null);
    setProjectChatBackgroundColor(project.id, null);
    const { syncSettingsToServer } = await import('@/hooks/use-settings-migration');
    await syncSettingsToServer();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        transparentOverlay
        className="sm:max-w-md w-[400px] flex flex-col p-0"
      >
        <SheetHeader className="px-5 pt-5 pb-0">
          <SheetTitle>Edit Project</SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="general" className="flex-1 overflow-hidden flex flex-col px-5">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5" />
              Appearance
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            <TabsContent value="general" className="space-y-4 m-0">
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
            </TabsContent>

            <TabsContent value="appearance" className="space-y-4 m-0">
              {/* Live Preview */}
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-muted/30">
                  {/* Sidebar preview */}
                  <div
                    className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center relative overflow-hidden',
                      'border transition-all duration-200'
                    )}
                    style={{
                      backgroundColor: backgroundColor || undefined,
                      borderColor: badgeColor || 'hsl(var(--border))',
                    }}
                  >
                    {customIconPath ? (
                      <img
                        src={getAuthenticatedImageUrl(customIconPath, project.path)}
                        alt={name}
                        className="w-8 h-8 rounded-lg object-cover"
                      />
                    ) : (
                      <IconComponent
                        className="w-6 h-6"
                        style={{ color: iconColor || 'hsl(var(--brand-500))' }}
                      />
                    )}
                  </div>
                  {/* Badge preview */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium" style={{ color: textColor || undefined }}>
                      {name || project.name}
                    </span>
                    <span
                      className="inline-flex items-center gap-1 text-xs bg-muted px-1.5 py-0.5 rounded w-fit"
                      style={{
                        borderWidth: badgeColor ? '1px' : undefined,
                        borderStyle: badgeColor ? 'solid' : undefined,
                        borderColor: badgeColor || undefined,
                        backgroundColor: backgroundColor || undefined,
                        color: textColor || undefined,
                      }}
                    >
                      <Folder className="w-3 h-3" style={{ color: iconColor || undefined }} />
                      {name || project.name}
                    </span>
                  </div>
                </div>
              </div>

              {/* Background Color */}
              <div className="space-y-2">
                <Label>Background Color</Label>
                <p className="text-xs text-muted-foreground">
                  Set a background color for this project in the sidebar
                </p>
                <ColorPicker
                  value={backgroundColor}
                  onChange={handleBackgroundColorChange}
                  colors={BACKGROUND_COLORS}
                  label="background"
                />
              </div>

              {/* Chat Background Color */}
              <div className="space-y-2">
                <Label>Chat Background Color</Label>
                <p className="text-xs text-muted-foreground">
                  Background tint for the message area when this project is active
                </p>
                <ColorPicker
                  value={chatBackgroundColor}
                  onChange={handleChatBackgroundColorChange}
                  colors={BACKGROUND_COLORS}
                  label="chat background"
                />
              </div>

              {/* Badge Border Color */}
              <div className="space-y-2">
                <Label>Border Color</Label>
                <p className="text-xs text-muted-foreground">
                  Add a colored border to distinguish this project
                </p>
                <ColorPicker
                  value={badgeColor}
                  onChange={handleBadgeColorChange}
                  colors={PROJECT_COLORS}
                  label="border"
                />
              </div>

              {/* Icon Color */}
              <div className="space-y-2">
                <Label>Icon Color</Label>
                <p className="text-xs text-muted-foreground">
                  Customize the icon color (only for preset icons)
                </p>
                <ColorPicker
                  value={iconColor}
                  onChange={handleIconColorChange}
                  colors={PROJECT_COLORS}
                  label="icon color"
                />
              </div>

              {/* Text Color */}
              <div className="space-y-2">
                <Label>Text Color</Label>
                <p className="text-xs text-muted-foreground">
                  Customize the text color for this project
                </p>
                <ColorPicker
                  value={textColor}
                  onChange={handleTextColorChange}
                  colors={PROJECT_COLORS}
                  label="text color"
                />
              </div>

              {/* Reset Colors Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetColors}
                className="w-full"
              >
                Reset All Colors
              </Button>
            </TabsContent>
          </div>
        </Tabs>

        <div className="px-5 pb-5 pt-2">
          <Button onClick={handleSave} disabled={!name.trim()} className="w-full">
            Done
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
