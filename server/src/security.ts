import type { NextFunction, Request, Response } from 'express';

/** Basic hardening headers. No CSP on purpose: the website loads Google Fonts and CodeMirror styles. */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.removeHeader('X-Powered-By');
  if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  next();
}

/** Limits login attempts per IP (in memory, per instance): slows down pseudo guessing and token brute force. */
export function authRateLimit(maxPerMinute = 60) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!/^\/(api\/)?auth\//.test(req.path)) return next();
    const now = Date.now();
    const key = req.ip ?? 'inconnu';
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + 60_000 };
      hits.set(key, entry);
    }
    entry.count += 1;
    if (hits.size > 5000) for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
    if (entry.count > maxPerMinute) {
      res.status(429).json({ statusCode: 429, message: 'Trop de tentatives, réessaie dans une minute.' });
      return;
    }
    next();
  };
}
