import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'api',
    fileParallelism: false,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    globalSetup: ['./test/globalSetup.ts'],
    env: { DATABASE_URL: 'postgresql://chemimon:chemimon@localhost:5433/chemimon_test' },
  },
});
