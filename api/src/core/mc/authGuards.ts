// api/src/core/mc/authGuards.ts
// MC V2 FINAL — §11.2 Auth Guards (thin wrapper over existing auth)

import type { Request, Response, NextFunction } from 'express';
import { requireAuth, requireFounder, tryAuthFromRequest } from '../../routes/auth.js';

/**
 * maybeAuth: Attempt to authenticate but don't block.
 * Sets req.auth if valid token exists, otherwise continues (never sends 401).
 */
export async function maybeAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const auth = await tryAuthFromRequest(req);
    req.auth = auth ?? undefined;
  } catch {
    req.auth = undefined;
  }
  next();
}

/**
 * mcRequireAuth: Require authentication for MC routes.
 * Delegates to existing requireAuth.
 */
export async function mcRequireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  requireAuth(req, res, next);
  return;
}

/**
 * mcRequireAdmin: Require founder-level access for MC admin routes.
 * Chains requireAuth → requireFounder.
 */
export async function mcRequireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  requireAuth(req, res, (err?: any) => {
    if (err) return next(err);
    requireFounder(req, res, next);
  });
  return;
}
