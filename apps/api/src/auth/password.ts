import { hash, verify } from '@node-rs/argon2';

// @node-rs/argon2 defaults to Argon2id.
export const hashPassword = (password: string): Promise<string> => hash(password);

// Warmed at import time (app creation), not on first unknown-email login.
const dummy: Promise<string> = hash('dummy-password');

/** Verify; with a null hash, burn equal time against a dummy hash (anti user-enumeration timing). */
export async function verifyPassword(stored: string | null, password: string): Promise<boolean> {
  if (stored === null) {
    await verify(await dummy, password).catch(() => false);
    return false;
  }
  return verify(stored, password).catch(() => false);
}
