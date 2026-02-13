/**
 * Documentation types for the Docs panel feature
 *
 * Types shared between server and UI for browsing, viewing,
 * creating, and managing documentation files in .automaker/docs/
 */

/**
 * Supported document file extensions
 */
export const SUPPORTED_DOC_EXTENSIONS = ['.md', '.txt', '.markdown', '.mdown'] as const;

/**
 * Single document file metadata
 */
export interface DocFile {
  /** Filename (e.g. "plan.md") */
  name: string;
  /** Relative path within .automaker/docs/ */
  path: string;
  /** Absolute path on the filesystem */
  absolutePath: string;
  /** File extension (e.g. ".md", ".txt") */
  extension: string;
  /** File size in bytes */
  size: number;
  /** ISO timestamp of creation */
  createdAt: string;
  /** ISO timestamp of last modification */
  modifiedAt: string;
  /** Whether this entry is a directory */
  isDirectory: boolean;
}

/**
 * Document file with its text content
 */
export interface DocContent {
  /** File metadata */
  file: DocFile;
  /** Text content of the file */
  content: string;
}

/**
 * Parameters for creating a new document
 */
export interface CreateDocParams {
  /** Project path */
  projectPath: string;
  /** Filename */
  name: string;
  /** Optional initial content */
  content?: string;
  /** Optional subfolder within docs/ */
  subfolder?: string;
}

/**
 * Parameters for updating a document
 */
export interface UpdateDocParams {
  /** Project path */
  projectPath: string;
  /** Relative path of the file within docs/ */
  filePath: string;
  /** New content */
  content: string;
}

/**
 * Parameters for deleting a document
 */
export interface DeleteDocParams {
  /** Project path */
  projectPath: string;
  /** Relative path of the file within docs/ */
  filePath: string;
}

/**
 * Parameters for listing documents
 */
export interface ListDocsParams {
  /** Project path */
  projectPath: string;
  /** Optional subfolder filter */
  subfolder?: string;
}

/**
 * Response for document listing
 */
export interface ListDocsResponse {
  /** List of document files */
  files: DocFile[];
  /** Total count */
  totalCount: number;
}
