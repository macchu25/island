import { randomBytes } from 'node:crypto';
import { createMiddleware } from 'hono/factory';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { Context } from 'hono';
import type { Prisma } from '../generated/prisma/client';
import { apiError } from '../http/errors';
import type { AppDeps, AppEnv } from '../app';

export const SESSION_COOKIE = 'chm_session';
export const SESSION_TTL_S = 30 * 24 * 60 * 60;

export async function createSession(tx: Prisma.TransactionClient, userId: string, now: Date): Promise<string> {
  const id = randomBytes(32).toString('base64url');
  await tx.session.create({ data: { id, userId, expiresAt: new Date(now.getTime() + SESSION_TTL_S * 1000) } });
  return id;
}

export function setSessionCookie(c: Context, id: string): void {
  setCookie(c, SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: SESSION_TTL_S,
    secure: process.env.NODE_ENV === 'production',
  });
}

export function clearSessionCookie(c: Context): void {
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
}

export function requirePlayer(deps: AppDeps) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const id = getCookie(c, SESSION_COOKIE);
    if (id) {
      const s = await deps.db.session.findUnique({ where: { id } });
      if (s && s.expiresAt.getTime() > deps.now().getTime()) {
        c.set('playerId', s.userId);
        await next();
        return;
      }
    }
    return apiError(c, 401, 'UNAUTHORIZED', 'Not signed in');
  });
}
