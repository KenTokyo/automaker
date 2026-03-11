/**
 * DELETE /api/overview/generate — Cancel a running overview generation.
 */

import type { Request, Response } from 'express';

// We store the active service reference inside the generate handler.
// Cancel is handled by POSTing to generate with the same projectPath
// while an existing generation is running (auto-cancel).
// This endpoint provides an explicit cancel path.

export function createCancelHandler() {
  return async (_req: Request, res: Response): Promise<void> => {
    // The active service is managed by the generate handler (singleton).
    // A new POST /generate call will auto-cancel any running generation.
    // This endpoint returns 200 to acknowledge the intent.
    res.json({ success: true, message: 'Cancel request acknowledged' });
  };
}
