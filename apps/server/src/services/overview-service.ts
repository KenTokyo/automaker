/**
 * Overview Service
 *
 * Sammelt Projektdaten (Markdown + Git), baut einen Prompt,
 * ruft die KI auf und liefert ein DashboardOverviewData-Objekt zurück.
 */

import { execSync } from 'child_process';
import { createHash } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { query, type Options } from '@anthropic-ai/claude-agent-sdk';
import { resolveModelString } from '@automaker/model-resolver';
import { secureFs } from '@automaker/platform';
import { createLogger } from '@automaker/utils';
import { getFilesFilteredByTime } from './markdown-explorer-service.js';
import type {
  DashboardMode,
  DashboardOverviewData,
  DashboardTimeRange,
  GenerateOverviewOptions,
  OverviewGitCommit,
  OverviewGitData,
  OverviewMarkdownData,
  OverviewStatusMap,
} from './overview-types.js';

const logger = createLogger('OverviewService');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_FILES = 30;
const MAX_PREVIEW_LINES = 50;
const MAX_PROMPT_CHARS = 50_000;
const MAX_GIT_COMMITS = 60;
const DEFAULT_MODEL = 'claude-sonnet-4-6';
const ALL_TIME_RANGES: DashboardTimeRange[] = ['12h', '24h', '4d', '1w'];
const MODEL_ALIAS_OVERRIDES = new Set(['sonnet', 'haiku', 'opus']);

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class OverviewService {
  private abortController: AbortController | null = null;

  constructor(
    private readonly projectPath: string,
    private readonly dataDir: string
  ) {}

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Hauptablauf: Daten sammeln, Prompt bauen, KI aufrufen, Ergebnis parsen.
   */
  async generateOverview(
    sinceHours: number,
    timeRange: DashboardTimeRange,
    options: GenerateOverviewOptions = {},
    onProgress?: (phase: string) => void
  ): Promise<DashboardOverviewData> {
    const startMs = Date.now();
    const mode = this.resolveMode(options.mode);
    const resolvedModel = this.resolveModelOverride(options.modelOverride);

    this.abortController = new AbortController();

    try {
      onProgress?.('Dateien sammeln…');
      const markdownData = await this.collectMarkdownData(sinceHours);

      onProgress?.('Git analysieren…');
      const gitData = this.collectGitData(sinceHours);

      onProgress?.('Prompt vorbereiten…');
      const { systemPrompt, userPrompt, truncated } = this.buildOverviewPrompt(
        markdownData,
        gitData,
        sinceHours,
        mode
      );

      onProgress?.('KI erstellt Übersicht…');
      const rawResponse = await this.callClaude(systemPrompt, userPrompt, resolvedModel);

      onProgress?.('Ergebnis verarbeiten…');
      const data = this.parseOverviewResponse(
        rawResponse,
        timeRange,
        truncated,
        resolvedModel,
        mode
      );

      data.metadata.durationMs = Date.now() - startMs;
      data.metadata.filesAnalysed = markdownData.length;
      data.metadata.gitAvailable = gitData.available;

      return data;
    } finally {
      this.abortController = null;
    }
  }

  /** Bricht eine laufende Generierung ab. */
  cancelGeneration(): void {
    this.abortController?.abort();
    this.abortController = null;
  }

  // -----------------------------------------------------------------------
  // Data Collection
  // -----------------------------------------------------------------------

  /**
   * Sammelt aktuelle Markdown-/Text-Dateien über den Explorer-Service.
   */
  async collectMarkdownData(sinceHours: number): Promise<OverviewMarkdownData[]> {
    const files = await getFilesFilteredByTime(this.projectPath, sinceHours, MAX_FILES * 3);
    const results: OverviewMarkdownData[] = [];

    for (const file of files) {
      if (results.length >= MAX_FILES) break;

      let preview = '';
      try {
        const raw = await secureFs.readFile(file.path, 'utf-8');
        const content = typeof raw === 'string' ? raw : raw.toString('utf-8');
        const lines = content.split('\n');
        preview = lines.slice(0, MAX_PREVIEW_LINES).join('\n');
      } catch {
        // Datei ist nicht lesbar - nur Metadaten übernehmen
      }

      const relativePath = path.relative(this.projectPath, file.path).replace(/\\/g, '/');

      results.push({
        path: relativePath,
        name: file.name,
        modified: file.modified,
        preview,
        size: file.size,
      });
    }

    return results;
  }

  /**
   * Sammelt Git-Commits für den Zeitraum.
   */
  collectGitData(sinceHours: number): OverviewGitData {
    const sinceArg = this.sinceHoursToGitSince(sinceHours);

    try {
      const raw = execSync(
        `git log --since="${sinceArg}" --pretty=format:"%h|%s|%an|%ai" --no-merges -n ${MAX_GIT_COMMITS + 1}`,
        { cwd: this.projectPath, encoding: 'utf-8', timeout: 15_000 }
      );

      const lines = raw.trim().split('\n').filter(Boolean);
      const totalCommits = lines.length;
      const commits: OverviewGitCommit[] = lines.slice(0, MAX_GIT_COMMITS).map((line) => {
        const [hash = '', message = '', author = '', date = ''] = line.split('|');
        return { hash, message, author, date };
      });

      return { available: true, commits, totalCommits };
    } catch {
      logger.warn('Git ist nicht verfügbar oder kein Repository - Git-Daten werden übersprungen');
      return { available: false, commits: [], totalCommits: 0 };
    }
  }

  // -----------------------------------------------------------------------
  // Prompt Builder
  // -----------------------------------------------------------------------

  private buildOverviewPrompt(
    markdownData: OverviewMarkdownData[],
    gitData: OverviewGitData,
    sinceHours: number,
    mode: DashboardMode
  ): { systemPrompt: string; userPrompt: string; truncated: boolean } {
    const timeLabel = this.sinceHoursToLabel(sinceHours);
    const modeInstructions = this.getModeInstructions(mode);

    const systemPrompt = [
      'Du bist ein Projekt-Analyst.',
      'Erstelle eine motivierende und leicht verständliche Projektübersicht.',
      ...modeInstructions,
      'Antworte nur mit einem JSON-Objekt im folgenden Schema (kein Markdown, kein zusätzlicher Text):',
      '',
      JSON.stringify(
        {
          summary: '<2-3 Sätze Gesamtübersicht>',
          sections: [
            {
              title: '<Bereichsname>',
              items: [{ text: '<Beschreibung>', file: '<optionaler Dateipfad>' }],
            },
          ],
          improvements: [
            { title: '<Titel>', description: '<Beschreibung>', priority: 'low|medium|high' },
          ],
          security: [
            { title: '<Titel>', description: '<Beschreibung>', severity: 'info|warning|critical' },
          ],
          stats: { filesChanged: 0, commits: 0, linesAdded: 0, linesRemoved: 0 },
        },
        null,
        2
      ),
    ].join('\n');

    let userPrompt = `Analysiere die Aktivitäten der letzten ${timeLabel}.\n\n`;

    if (markdownData.length > 0) {
      userPrompt += `## Geänderte Dateien (${markdownData.length})\n\n`;
      for (const file of markdownData) {
        userPrompt += `### ${file.path}\n`;
        if (file.preview) {
          userPrompt += `\`\`\`\n${file.preview}\n\`\`\`\n\n`;
        }
      }
    } else {
      userPrompt += 'Keine geänderten Dateien in diesem Zeitraum gefunden.\n\n';
    }

    if (gitData.available && gitData.commits.length > 0) {
      userPrompt += `## Git-Commits (${gitData.totalCommits})\n\n`;
      for (const commit of gitData.commits) {
        userPrompt += `- \`${commit.hash}\` ${commit.message} (${commit.author}, ${commit.date})\n`;
      }
      userPrompt += '\n';
    } else if (!gitData.available) {
      userPrompt += 'Git ist nicht verfügbar oder kein Repository.\n\n';
    } else {
      userPrompt += 'Keine Git-Commits in diesem Zeitraum.\n\n';
    }

    let truncated = false;
    const totalChars = systemPrompt.length + userPrompt.length;

    if (totalChars > MAX_PROMPT_CHARS) {
      truncated = true;
      userPrompt = this.truncatePromptContent(userPrompt, MAX_PROMPT_CHARS - systemPrompt.length);
    }

    return { systemPrompt, userPrompt, truncated };
  }

  private getModeInstructions(mode: DashboardMode): string[] {
    if (mode === 'simplify') {
      return [
        'Schreibe sehr einfach, so dass es ein 8.-Klässler direkt versteht.',
        'Nutze kurze Sätze und vermeide Fachbegriffe.',
        'Maximal 2 Sätze pro Punkt.',
      ];
    }

    if (mode === 'detail') {
      return [
        'Erkläre jeden wichtigen Punkt genauer und mit mehr Kontext.',
        'Zeige Zusammenhänge zwischen Änderungen.',
        'Nenne konkrete Dateien, wenn es sinnvoll ist.',
      ];
    }

    return [
      'Nutze klare Alltagssprache und bleibe motivierend.',
      'Halte die Übersicht kompakt und gut lesbar.',
    ];
  }

  private truncatePromptContent(content: string, maxChars: number): string {
    if (content.length <= maxChars) return content;
    const truncatedContent = content.slice(0, Math.max(0, maxChars - 80));
    return `${truncatedContent}\n\n[...Inhalt wegen Länge gekürzt...]\n`;
  }

  // -----------------------------------------------------------------------
  // Claude Call (via Agent SDK - one-shot, no tools)
  // -----------------------------------------------------------------------

  private async callClaude(
    systemPrompt: string,
    userPrompt: string,
    model: string
  ): Promise<string> {
    const sdkOptions: Options = {
      model,
      systemPrompt,
      maxTurns: 1,
      cwd: this.projectPath,
      permissionMode: 'bypassPermissions',
      allowedTools: [],
      abortController: this.abortController ?? undefined,
    };

    const textParts: string[] = [];

    try {
      const stream = query({ prompt: userPrompt, options: sdkOptions });

      for await (const msg of stream) {
        if (
          msg.type === 'assistant' &&
          Array.isArray((msg as { message?: { content?: unknown } }).message?.content)
        ) {
          for (const block of (
            msg as { message: { content: Array<{ type?: string; text?: string }> } }
          ).message.content) {
            if (block.type === 'text' && typeof block.text === 'string') {
              textParts.push(block.text);
            }
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new Error('Generierung wurde abgebrochen');
      }
      logger.error('KI-Aufruf fehlgeschlagen:', error);
      throw new Error(`KI-Aufruf fehlgeschlagen: ${(error as Error).message}`);
    }

    const result = textParts.join('');
    if (!result) {
      throw new Error('KI hat keine Antwort geliefert');
    }

    return result;
  }

  // -----------------------------------------------------------------------
  // JSON Parser
  // -----------------------------------------------------------------------

  private parseOverviewResponse(
    rawResponse: string,
    timeRange: DashboardTimeRange,
    truncated: boolean,
    model: string,
    mode: DashboardMode
  ): DashboardOverviewData {
    let parsed: Record<string, unknown> | null = null;

    const jsonBlockMatch = rawResponse.match(/```json\s*([\s\S]*?)```/);
    if (jsonBlockMatch) {
      try {
        parsed = JSON.parse(jsonBlockMatch[1].trim()) as Record<string, unknown>;
      } catch {
        // nächste Strategie
      }
    }

    if (!parsed) {
      try {
        parsed = JSON.parse(rawResponse.trim()) as Record<string, unknown>;
      } catch {
        // nächste Strategie
      }
    }

    if (!parsed) {
      const firstBrace = rawResponse.indexOf('{');
      const lastBrace = rawResponse.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        try {
          parsed = JSON.parse(rawResponse.slice(firstBrace, lastBrace + 1)) as Record<
            string,
            unknown
          >;
        } catch {
          // Fallback unten
        }
      }
    }

    const now = new Date().toISOString();
    const parsedStats = this.toRecord(parsed?.stats);

    return {
      timeRange,
      generatedAt: now,
      model,
      mode,
      summary: typeof parsed?.summary === 'string' ? parsed.summary : rawResponse.slice(0, 500),
      sections: Array.isArray(parsed?.sections)
        ? (parsed.sections as DashboardOverviewData['sections'])
        : [],
      improvements: Array.isArray(parsed?.improvements)
        ? (parsed.improvements as DashboardOverviewData['improvements'])
        : [],
      security: Array.isArray(parsed?.security)
        ? (parsed.security as DashboardOverviewData['security'])
        : [],
      stats: {
        filesChanged: this.toNumber(parsedStats.filesChanged),
        commits: this.toNumber(parsedStats.commits),
        linesAdded: this.toNumber(parsedStats.linesAdded),
        linesRemoved: this.toNumber(parsedStats.linesRemoved),
      },
      metadata: {
        gitAvailable: false,
        filesAnalysed: 0,
        truncated,
        durationMs: 0,
      },
    };
  }

  // -----------------------------------------------------------------------
  // Persistence
  // -----------------------------------------------------------------------

  /** Speichert ein Overview-Ergebnis als JSON. */
  async saveOverview(data: DashboardOverviewData): Promise<void> {
    const dir = this.getOverviewDir();
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, `overview-${data.timeRange}.json`);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    logger.info(`Overview gespeichert: ${filePath}`);
  }

  /** Lädt ein gespeichertes Overview-Ergebnis. */
  async loadOverview(timeRange: DashboardTimeRange): Promise<DashboardOverviewData | null> {
    const filePath = path.join(this.getOverviewDir(), `overview-${timeRange}.json`);
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(raw) as DashboardOverviewData;
    } catch {
      return null;
    }
  }

  /** Liefert den Status für alle Zeiträume. */
  async getOverviewStatus(): Promise<OverviewStatusMap> {
    const status: OverviewStatusMap = {
      '12h': { exists: false },
      '24h': { exists: false },
      '4d': { exists: false },
      '1w': { exists: false },
    };

    for (const tr of ALL_TIME_RANGES) {
      const data = await this.loadOverview(tr);
      if (data) {
        status[tr] = { exists: true, generatedAt: data.generatedAt };
      }
    }

    return status;
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  private resolveMode(mode?: DashboardMode): DashboardMode {
    if (mode === 'simplify' || mode === 'detail') {
      return mode;
    }
    return 'standard';
  }

  private resolveModelOverride(modelOverride?: string): string {
    if (!modelOverride || modelOverride.trim().length === 0) {
      return DEFAULT_MODEL;
    }

    const requested = modelOverride.trim().toLowerCase();

    if (!MODEL_ALIAS_OVERRIDES.has(requested) && !requested.startsWith('claude-')) {
      logger.warn(`Ungültiges Dashboard-Modell "${modelOverride}" - nutze Standardmodell`);
      return DEFAULT_MODEL;
    }

    const resolved = resolveModelString(requested, DEFAULT_MODEL);
    if (!resolved || resolved.trim().length === 0) {
      logger.warn(`Modellauflösung leer für "${modelOverride}" - nutze Standardmodell`);
      return DEFAULT_MODEL;
    }

    return resolved;
  }

  private toRecord(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object') {
      return value as Record<string, unknown>;
    }
    return {};
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private getOverviewDir(): string {
    const hash = createHash('sha256').update(this.projectPath).digest('hex').slice(0, 12);
    return path.join(this.dataDir, 'overviews', hash);
  }

  private sinceHoursToGitSince(hours: number): string {
    if (hours <= 24) return `${hours} hours ago`;
    const days = Math.ceil(hours / 24);
    return `${days} days ago`;
  }

  private sinceHoursToLabel(hours: number): string {
    if (hours <= 12) return '12 Stunden';
    if (hours <= 24) return '24 Stunden';
    if (hours <= 96) return '4 Tage';
    return '1 Woche';
  }
}
