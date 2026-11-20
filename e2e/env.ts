/** Ports and URLs for the e2e stack. They differ from dev (3101/5173) so a running `pnpm dev` never gets tested by mistake. */
export const E2E_API_PORT = 3111;
export const E2E_WEB_PORT = 5183;
export const E2E_API_URL = `http://localhost:${E2E_API_PORT}`;
export const E2E_WEB_URL = `http://localhost:${E2E_WEB_PORT}`;
export const E2E_DATABASE_URL = 'postgresql://chemimon:chemimon@localhost:5433/chemimon_test';
