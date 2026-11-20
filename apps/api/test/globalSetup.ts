import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export default function setup(): void {
  const cwd = fileURLToPath(new URL('..', import.meta.url));
  const env = {
    ...process.env,
    DATABASE_URL: 'postgresql://chemimon:chemimon@localhost:5433/chemimon_test',
  };
  execFileSync('pnpm', ['exec', 'prisma', 'generate'], { cwd, env, stdio: 'inherit' });
  execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], { cwd, env, stdio: 'inherit' });
}
