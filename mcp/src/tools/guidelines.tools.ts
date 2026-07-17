import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { paths } from '../config.js';
import { errorResult, textResult } from '../utils.js';

const TOPICS = ['frontend', 'backend', 'project', 'i18n'] as const;

export function registerGuidelinesTools(server: McpServer): void {
  server.tool(
    'get_project_guidelines',
    'OBRIGATÓRIO antes de criar features: regras de arquitetura frontend/backend/i18n/projeto.',
    {
      topic: z.enum(TOPICS).describe('Escopo das guidelines'),
    },
    async ({ topic }) => {
      try {
        const file = path.join(paths.guidelinesDir, `${topic}.md`);
        const content = await readFile(file, 'utf8');

        let extra = '';
        if (topic === 'frontend') {
          try {
            extra =
              '\n\n---\n\n## cursor.mdc (vivo)\n\n' +
              (await readFile(paths.frontendRules, 'utf8'));
          } catch {
            // optional
          }
        }

        return textResult(content + extra);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    'check_pre_implementation',
    'Checklist obrigatório antes de codar uma feature. Reduz drift de padrão e alucinação de schema.',
    {
      area: z
        .enum(['frontend', 'backend', 'fullstack', 'database'])
        .describe('Área da feature'),
    },
    async ({ area }) => {
      const steps: string[] = [
        '1. Chamar get_project_guidelines com o topic adequado (project + área).',
      ];

      if (area === 'frontend' || area === 'fullstack') {
        steps.push(
          '2. get_frontend_component_blueprint e/ou get_frontend_service_blueprint.',
          '3. validate_path_conventions para os paths propostos.',
          '4. Planejar chaves i18n (get_i18n_key_template) e depois check_i18n_parity.',
          '5. list_frontend_routes — não duplicar rotas.',
        );
      }

      if (area === 'backend' || area === 'fullstack') {
        steps.push(
          '2. list_backend_modules — evitar módulos duplicados.',
          '3. get_nest_module_blueprint (e get_nest_entity_blueprint se houver persistência).',
          '4. Documentar no Swagger (@ApiTags).',
          '5. Manter synchronize: false; migrations para schema.',
        );
      }

      if (area === 'database' || area === 'fullstack' || area === 'backend') {
        steps.push(
          'DB. get_connection_info → list_tables → get_table_schema / get_table_relations.',
          'DB. run_select_query apenas para leitura (SELECT-only).',
          'DB. Nunca inventar colunas; comparar com information_schema.',
        );
      }

      steps.push(
        'Final. Implementar seguindo os blueprints; não introduzir stacks novas sem necessidade.',
      );

      return textResult({
        area,
        checklist: steps,
        reminder:
          'Este MCP bloqueia SQL de escrita. Mudanças de schema devem ser migrations revisadas.',
      });
    },
  );
}
