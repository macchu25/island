import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { LoginRequestSchema, RegisterRequestSchema } from '@chemimon/shared';
import { Prisma } from '../generated/prisma/client';
import type { AppDeps, AppEnv } from '../app';
import { apiError } from '../http/errors';
import { parseBody } from '../http/validate';
import { buildMe } from '../player/me';
import { grantStarterKit } from '../player/grant';
import { hashPassword, verifyPassword } from './password';
import { clearSessionCookie, createSession, SESSION_COOKIE, setSessionCookie } from './session';

export class Taken extends Error {
  constructor(readonly code: 'EMAIL_TAKEN' | 'DISPLAY_NAME_TAKEN') {
    super(code);
  }
}

/** Classify a Prisma P2002 from users. Prisma 7 + pg adapter reports meta.driverAdapterError.cause.constraint.index (e.g. users_email_key). */
export function takenFromP2002(e: unknown): Taken | null {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== 'P2002') return null;
  const meta = e.meta as { driverAdapterError?: { cause?: { constraint?: { index?: string } } }; target?: unknown } | undefined;
  const index = meta?.driverAdapterError?.cause?.constraint?.index;
  if (index === 'users_email_key') return new Taken('EMAIL_TAKEN');
  if (index === 'users_display_name_key') return new Taken('DISPLAY_NAME_TAKEN');
  // Fallback for other driver shapes (e.g. meta.target).
  const t = JSON.stringify(meta ?? {}).toLowerCase();
  return new Taken(t.includes('display') ? 'DISPLAY_NAME_TAKEN' : 'EMAIL_TAKEN');
}

export function authRoutes(deps: AppDeps) {
  const r = new Hono<AppEnv>();

  r.post('/register', async (c) => {
    const p = await parseBody(c, RegisterRequestSchema);
    if (!p.ok) return p.res;
    const email = p.data.email.trim().toLowerCase();
    const passwordHash = await hashPassword(p.data.password);
    try {
      const { userId, sid } = await deps.db.$transaction(async (tx) => {
        if (await tx.user.findUnique({ where: { email } })) throw new Taken('EMAIL_TAKEN');
        if (await tx.user.findUnique({ where: { displayName: p.data.displayName } })) throw new Taken('DISPLAY_NAME_TAKEN');
        const u = await tx.user.create({ data: { email, displayName: p.data.displayName, passwordHash } });
        await grantStarterKit(tx, u.id);
        return { userId: u.id, sid: await createSession(tx, u.id, deps.now()) };
      });
      const me = await buildMe(deps, userId);
      setSessionCookie(c, sid);
      return c.json(me, 201);
    } catch (e) {
      const taken = e instanceof Taken ? e : takenFromP2002(e);
      if (taken) {
        return apiError(c, 409, taken.code, taken.code === 'EMAIL_TAKEN' ? 'Email already registered' : 'Display name already taken');
      }
      throw e;
    }
  });

  r.post('/login', async (c) => {
    const p = await parseBody(c, LoginRequestSchema);
    if (!p.ok) return p.res;
    const user = await deps.db.user.findUnique({ where: { email: p.data.email.trim().toLowerCase() } });
    const ok = await verifyPassword(user?.passwordHash ?? null, p.data.password);
    if (!user || !ok) return apiError(c, 401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    const sid = await createSession(deps.db, user.id, deps.now());
    const me = await buildMe(deps, user.id);
    setSessionCookie(c, sid);
    return c.json(me, 200);
  });

  r.post('/logout', async (c) => {
    const id = getCookie(c, SESSION_COOKIE);
    if (id) await deps.db.session.deleteMany({ where: { id } });
    clearSessionCookie(c);
    return c.body(null, 204);
  });

  return r;
}
