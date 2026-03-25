/**
 * Hook: Text als Markdown-Datei speichern
 *
 * Speichert den aktuellen Textarea-Inhalt als .md-Datei
 * unter .automaker/docs/ und gibt den relativen Pfad zurück.
 */

import { useState, useCallback } from 'react';
import { apiPost } from '@/lib/api-fetch';

interface SaveAsMarkdownOptions {
  /** Absoluter Projektpfad */
  projectPath: string | null;
  /** Aktueller Textarea-Inhalt */
  input: string;
  /** Callback: Input ersetzen (z.B. durch Pfad-Referenz) */
  onInputChange: (value: string) => void;
}

interface SaveResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

/**
 * Erzeugt einen eindeutigen Dateinamen: YYYY-MM-DD_HHmmss_notiz.md
 */
function generateFileName(): string {
  const now = new Date();
  const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const time = now.toTimeString().split(' ')[0].replace(/:/g, ''); // HHmmss
  return `${date}_${time}_notiz.md`;
}

/**
 * Erzeugt einen kurzen Titel aus den ersten ~80 Zeichen des Textes
 */
function extractTitle(text: string): string {
  const firstLine = text.split('\n')[0].trim();
  if (firstLine.length <= 80) return firstLine;
  return firstLine.slice(0, 77) + '...';
}

export function useSaveAsMarkdown({ projectPath, input, onInputChange }: SaveAsMarkdownOptions) {
  const [isSaving, setIsSaving] = useState(false);

  const saveAsMarkdown = useCallback(async (): Promise<SaveResult> => {
    const trimmedInput = input.trim();

    if (!trimmedInput) {
      return { success: false, error: 'Kein Text zum Speichern vorhanden.' };
    }

    if (!projectPath) {
      return { success: false, error: 'Kein Projekt ausgewählt.' };
    }

    setIsSaving(true);

    try {
      const fileName = generateFileName();
      const title = extractTitle(trimmedInput);
      const now = new Date();

      // Markdown mit YAML-Frontmatter erstellen
      const markdownContent = [
        '---',
        `title: "${title.replace(/"/g, '\\"')}"`,
        `date: ${now.toISOString()}`,
        `type: notiz`,
        '---',
        '',
        trimmedInput,
        '',
      ].join('\n');

      // Pfad zusammenbauen: {projectPath}/.automaker/docs/{fileName}
      const separator = projectPath.includes('/') ? '/' : '\\';
      const filePath = `${projectPath}${separator}.automaker${separator}docs${separator}${fileName}`;
      const relativePath = `.automaker/docs/${fileName}`;

      // Via API speichern
      const result = await apiPost<{ success: boolean; error?: string }>('/api/fs/write', {
        filePath,
        content: markdownContent,
      });

      if (!result.success) {
        return { success: false, error: result.error || 'Speichern fehlgeschlagen.' };
      }

      // Input durch Pfad-Referenz ersetzen
      const reference = `Meine Notizen: ${relativePath}`;
      onInputChange(reference);

      return { success: true, filePath: relativePath };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      return { success: false, error: message };
    } finally {
      setIsSaving(false);
    }
  }, [input, projectPath, onInputChange]);

  const canSave = Boolean(input.trim()) && Boolean(projectPath) && !isSaving;

  return { saveAsMarkdown, isSaving, canSave };
}
