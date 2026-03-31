/**
 * Hook: Text als Markdown-Datei speichern
 *
 * Speichert den aktuellen Textarea-Inhalt als .md-Datei
 * unter Notes/ (direkt im Projektstamm) und gibt den relativen Pfad zurück.
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
 * Extrahiert die ersten 5 Wörter aus dem Text als Slug für den Dateinamen.
 * Entfernt Sonderzeichen, normalisiert auf Kleinbuchstaben, verbindet mit Bindestrichen.
 * Fallback auf Datum+Uhrzeit wenn keine Wörter extrahiert werden können.
 *
 * Beispiel: "Heute habe ich einen neuen Button gebaut" → "heute-habe-ich-einen-neuen-notiz.md"
 */
function generateFileName(text: string): string {
  // Alle Wörter extrahieren (nur Buchstaben, Zahlen, Umlaute)
  const words = text
    .replace(/[^a-zA-ZäöüÄÖÜß0-9\s]/g, ' ')
    .split(/\s+/)
    .map((w) => w.toLowerCase().trim())
    .filter((w) => w.length > 0);

  if (words.length > 0) {
    const slug = words.slice(0, 5).join('-');
    return `${slug}-notiz.md`;
  }

  // Fallback: Datum + Uhrzeit
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const time = now.toTimeString().split(' ')[0].replace(/:/g, '');
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
      const fileName = generateFileName(trimmedInput);
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

      // Pfad zusammenbauen: {projectPath}/Notes/{fileName}
      const separator = projectPath.includes('/') ? '/' : '\\';
      const filePath = `${projectPath}${separator}Notes${separator}${fileName}`;
      const relativePath = `Notes/${fileName}`;

      // Via API speichern
      const result = await apiPost<{ success: boolean; error?: string }>('/api/fs/write', {
        filePath,
        content: markdownContent,
      });

      if (!result.success) {
        return { success: false, error: result.error || 'Speichern fehlgeschlagen.' };
      }

      // Input durch Pfad-Referenz + Aufgaben-Anweisung ersetzen
      const reference = `Meine Notizen: ${relativePath}\n\nSollten in der Notiz Aufgaben stehen, bitte löse diese bzw. orientiere dich an den enthaltenen Aufgaben.`;
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
