import { hash, verify } from '@node-rs/argon2';

// @node-rs/argon2 defaults to Argon2id.
export const hashPassword = (password: string): Promise<string> => hash(password);

let dummy: Promise<string> | undefined;

/** Verify; with a null hash, burn equal time against a dummy hash (anti user-enumeration timing). */
export async function verifyPassword(stored: string | null, password: string): Promise<boolean> {
  if (stored === null) {
    dummy ??= hash('dummy-password');
    await verify(await dummy, password).catch(() => false);
    return false;
  }
  return verify(stored, password).catch(() => false);
}
