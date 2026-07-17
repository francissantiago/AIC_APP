import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { buildFrontendComponentBlueprint } from '../blueprints/frontend-component.js';
import { buildFrontendServiceBlueprint } from '../blueprints/frontend-service.js';
import {
  buildNestEntityBlueprint,
  buildNestModuleBlueprint,
} from '../blueprints/nest-module.js';
import { errorResult, textResult } from '../utils.js';

export function registerBlueprintTools(server: McpServer): void {
  server.tool(
    'get_frontend_component_blueprint',
    'Blueprint de componente Angular no padrão de frontend/src/app/components/example (OnPush, TranslatePipe, paths relativos).',
    {
      name: z
        .string()
        .describe('Nome do componente (ex.: member-list ou MemberList)'),
    },
    async ({ name }) => {
      try {
        return textResult(buildFrontendComponentBlueprint(name));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    'get_frontend_service_blueprint',
    'Blueprint de serviço Angular no padrão de example-service.ts (HttpClient, retry 5xx, interfaces).',
    {
      name: z.string().describe('Nome do recurso/serviço (ex.: members)'),
      resourcePath: z
        .string()
        .optional()
        .describe('Segmento de URL opcional (ex.: members)'),
    },
    async ({ name, resourcePath }) => {
      try {
        return textResult(buildFrontendServiceBlueprint(name, resourcePath));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    'get_nest_module_blueprint',
    'Blueprint NestJS module+controller+service no estilo backend/src/health (Swagger incluso).',
    {
      name: z.string().describe('Nome do módulo (ex.: members)'),
    },
    async ({ name }) => {
      try {
        return textResult(buildNestModuleBlueprint(name));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    'get_nest_entity_blueprint',
    'Stub de entity TypeORM. synchronize=false — confirmar schema no MySQL antes.',
    {
      name: z.string().describe('Nome da entity (ex.: member)'),
      tableName: z
        .string()
        .optional()
        .describe('Nome real da tabela no MySQL'),
    },
    async ({ name, tableName }) => {
      try {
        return textResult(buildNestEntityBlueprint(name, tableName));
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
