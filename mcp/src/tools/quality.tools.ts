import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { paths } from '../config.js';
import { errorResult, textResult, toConstCase } from '../utils.js';

const LOCALES = ['en', 'es', 'pt-BR'] as const;

const FRONTEND_PREFIXES = [
  'frontend/src/app/components/',
  'frontend/src/app/services/',
  'frontend/src/app/interfaces/',
  'frontend/src/app/enums/',
  'frontend/src/app/guards/',
  'frontend/src/app/interceptors/',
  'frontend/src/app/pipes/',
  'frontend/src/app/resolvers/',
  'frontend/src/app/models/',
] as const;

function flattenKeys(obj: unknown, prefix = ''): string[] {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return prefix ? [prefix] : [];
  }

  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flattenKeys(value, next));
    } else {
      keys.push(next);
    }
  }
  return keys;
}

async function loadLocaleKeys(
  locale: string,
): Promise<{ keys: string[]; error?: string }> {
  const file = path.join(paths.frontendI18n, `${locale}.json`);
  try {
    const raw = await readFile(file, 'utf8');
    const json = JSON.parse(raw) as unknown;
    return { keys: flattenKeys(json).sort() };
  } catch (error) {
    return {
      keys: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function walkModules(dir: string): Promise<string[]> {
  const found: string[] = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return found;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...(await walkModules(full)));
    } else if (entry.isFile() && entry.name.endsWith('.module.ts')) {
      found.push(path.relative(paths.backendSrc, full).replace(/\\/g, '/'));
    }
  }
  return found;
}

export function registerQualityTools(server: McpServer): void {
  server.tool(
    'list_backend_modules',
    'Lista arquivos *.module.ts em backend/src para não inventar estrutura.',
    {},
    async () => {
      try {
        const modules = (await walkModules(paths.backendSrc)).sort();
        return textResult({ modules });
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    'list_frontend_routes',
    'Retorna o conteúdo atual de frontend/src/app/app.routes.ts.',
    {},
    async () => {
      try {
        const content = await readFile(paths.frontendRoutes, 'utf8');
        return textResult({ path: 'frontend/src/app/app.routes.ts', content });
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    'check_i18n_parity',
    'Compara chaves em en / es / pt-BR e reporta faltantes.',
    {},
    async () => {
      try {
        const loaded = await Promise.all(
          LOCALES.map(async (locale) => ({
            locale,
            ...(await loadLocaleKeys(locale)),
          })),
        );

        const union = new Set<string>();
        for (const item of loaded) {
          for (const key of item.keys) union.add(key);
        }

        const missing: Record<string, string[]> = {};
        for (const item of loaded) {
          const set = new Set(item.keys);
          missing[item.locale] = [...union].filter((k) => !set.has(k)).sort();
        }

        const ok = Object.values(missing).every((m) => m.length === 0);

        return textResult({
          ok,
          locales: loaded.map((l) => ({
            locale: l.locale,
            keyCount: l.keys.length,
            error: l.error,
          })),
          missing,
        });
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    'get_i18n_key_template',
    'Gera bloco JSON template para um prefixo nos 3 idiomas (en, es, pt-BR).',
    {
      prefix: z
        .string()
        .describe('Prefixo do namespace (ex.: MEMBERS ou members)'),
      keys: z
        .array(z.string())
        .optional()
        .describe('Chaves filhas (default: TITLE, DESCRIPTION)'),
    },
    async ({ prefix, keys }) => {
      const ns = toConstCase(prefix);
      const children = keys?.length ? keys : ['TITLE', 'DESCRIPTION'];
      const block: Record<string, string> = {};
      for (const key of children) {
        block[key] = '';
      }

      return textResult({
        namespace: ns,
        files: {
          'en.json': { [ns]: block },
          'es.json': { [ns]: block },
          'pt-BR.json': { [ns]: block },
        },
        hint: 'Mesclar sob a raiz de cada arquivo em frontend/public/i18n/',
      });
    },
  );

  server.tool(
    'validate_path_conventions',
    'Valida se um path proposto respeita pastas canônicas do frontend Angular ou backend Nest.',
    {
      path: z
        .string()
        .describe(
          'Path relativo à raiz do monorepo (ex.: frontend/src/app/components/foo/foo.ts)',
        ),
    },
    async ({ path: targetPath }) => {
      const normalized = targetPath.replace(/\\/g, '/').replace(/^\.\//, '');

      if (normalized.startsWith('frontend/')) {
        const allowed = FRONTEND_PREFIXES.some((p) =>
          normalized.startsWith(p),
        );
        const underApp = normalized.startsWith('frontend/src/app/');
        return textResult({
          path: normalized,
          layer: 'frontend',
          valid: allowed,
          underApp,
          allowedPrefixes: FRONTEND_PREFIXES,
          message: allowed
            ? 'Path alinhado aos schematics Angular do projeto.'
            : 'Path fora das pastas canônicas. Use components/services/interfaces/enums/etc.',
        });
      }

      if (normalized.startsWith('backend/')) {
        const underSrc = normalized.startsWith('backend/src/');
        const looksModule =
          /backend\/src\/[a-z0-9-]+\/[a-z0-9-]+\.(module|controller|service|entity|gateway)\.ts$/i.test(
            normalized,
          );
        return textResult({
          path: normalized,
          layer: 'backend',
          valid: underSrc && (looksModule || normalized === 'backend/src/main.ts' || normalized === 'backend/src/app.module.ts'),
          message: underSrc
            ? looksModule ||
              normalized.endsWith('main.ts') ||
              normalized.endsWith('app.module.ts')
              ? 'Path alinhado à estrutura Nest do scaffold.'
              : 'Sob backend/src, prefira pastas de domínio com *.module|controller|service|entity|gateway.ts'
            : 'Backend deve ficar sob backend/src/',
        });
      }

      return textResult({
        path: normalized,
        valid: false,
        message: 'Path deve começar com frontend/ ou backend/.',
      });
    },
  );
}
