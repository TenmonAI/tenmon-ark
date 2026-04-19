// api/src/core/mc/authGuards.ts
// MC V2 FINAL — §11.2 Auth Guards (thin wrapper over existing auth)

import type { Request, Response, NextFunction } from 'express';
import { requireAuth, requireFounder } from '../../routes/auth.js';

/**
 * maybeAuth: Attempt to authenticate but don't block.
 * Sets req.auth if valid token exists, otherwise continues.
 */
export async function maybeAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Store original json to intercept 401
  const origJson = res.json.bind(res);
  let blocked = false;

  const fakeRes = Object.create(res);
  fakeRes.status = (code: number) => {
    if (code === 401) {
      blocked = true;
      return { json: () => {} };
    }
    return res.status(code);
  };
  fakeRes.json = (body: any) => {
    if (blocked) return fakeRes;
    return origJson(body);
  };

  try {
    await requireAuth(req, fakeRes as Response, () => {});
  } catch {
    // Ignore auth errors in maybeAuth
  }

  if (!blocked && req.auth) {
    return next();
  }

  // No auth — continue anyway (unauthenticated)
  req.auth = undefined;
  return next();
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
