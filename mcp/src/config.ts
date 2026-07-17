import { config as loadEnv } from 'dotenv';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** mcp/src -> mcp -> repo root */
export const MCP_ROOT = path.resolve(__dirname, '..');
export const REPO_ROOT = path.resolve(MCP_ROOT, '..');

const mcpEnvPath = path.join(MCP_ROOT, '.env');
const backendEnvPath = path.join(REPO_ROOT, 'backend', '.env');

if (existsSync(mcpEnvPath)) {
  loadEnv({ path: mcpEnvPath });
} else if (existsSync(backendEnvPath)) {
  loadEnv({ path: backendEnvPath });
}

export const paths = {
  repoRoot: REPO_ROOT,
  mcpRoot: MCP_ROOT,
  frontendRoot: path.join(REPO_ROOT, 'frontend'),
  backendRoot: path.join(REPO_ROOT, 'backend'),
  frontendComponents: path.join(REPO_ROOT, 'frontend', 'src', 'app', 'components'),
  frontendServices: path.join(REPO_ROOT, 'frontend', 'src', 'app', 'services'),
  frontendInterfaces: path.join(REPO_ROOT, 'frontend', 'src', 'app', 'interfaces'),
  frontendEnums: path.join(REPO_ROOT, 'frontend', 'src', 'app', 'enums'),
  frontendRoutes: path.join(REPO_ROOT, 'frontend', 'src', 'app', 'app.routes.ts'),
  frontendI18n: path.join(REPO_ROOT, 'frontend', 'public', 'i18n'),
  frontendRules: path.join(REPO_ROOT, 'frontend', '.cursor', 'rules', 'cursor.mdc'),
  backendSrc: path.join(REPO_ROOT, 'backend', 'src'),
  exampleComponentDir: path.join(
    REPO_ROOT,
    'frontend',
    'src',
    'app',
    'components',
    'example',
  ),
  exampleService: path.join(
    REPO_ROOT,
    'frontend',
    'src',
    'app',
    'services',
    'example-service.ts',
  ),
  healthModuleDir: path.join(REPO_ROOT, 'backend', 'src', 'health'),
  guidelinesDir: path.join(MCP_ROOT, 'src', 'guidelines'),
} as const;

export const dbConfig = {
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'db_aic',
};

export const QUERY_ROW_LIMIT = 200;
export const QUERY_TIMEOUT_MS = 15_000;
