import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { dbConfig, QUERY_ROW_LIMIT } from '../config.js';
import {
  getTableRelations,
  getTableSchema,
  listTables,
  runExplain,
  runReadOnlyQuery,
} from '../db/pool.js';
import { errorResult, textResult } from '../utils.js';

export function registerDatabaseTools(server: McpServer): void {
  server.tool(
    'get_connection_info',
    'Retorna host/porta/database MySQL do AIC (sem credenciais).',
    {},
    async () =>
      textResult({
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database,
        userConfigured: Boolean(dbConfig.user),
        mode: 'SELECT-only',
      }),
  );

  server.tool(
    'list_tables',
    'Lista tabelas do database MySQL configurado (db_aic por padrão).',
    {},
    async () => {
      try {
        const tables = await listTables();
        return textResult({ database: dbConfig.database, tables });
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    'get_table_schema',
    'Obtém colunas, tipos e chaves de uma tabela via information_schema.',
    { tableName: z.string().describe('Nome exato da tabela') },
    async ({ tableName }) => {
      try {
        const columns = await getTableSchema(tableName);
        return textResult({ tableName, columns });
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    'get_table_relations',
    'Obtém foreign keys de uma tabela via information_schema.',
    { tableName: z.string().describe('Nome exato da tabela') },
    async ({ tableName }) => {
      try {
        const relations = await getTableRelations(tableName);
        return textResult({ tableName, relations });
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    'run_select_query',
    'Executa SQL de leitura (SELECT/SHOW/DESCRIBE/EXPLAIN). Escrita/DDL é rejeitada. Limite padrão de linhas aplicado na resposta.',
    {
      query: z.string().describe('SQL de leitura'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(QUERY_ROW_LIMIT)
        .optional()
        .describe(`Máximo de linhas retornadas (default ${QUERY_ROW_LIMIT})`),
    },
    async ({ query, limit }) => {
      try {
        const max = limit ?? QUERY_ROW_LIMIT;
        const { rows, fields } = await runReadOnlyQuery(query);
        const truncated = rows.length > max;
        return textResult({
          fields,
          rowCount: rows.length,
          returned: Math.min(rows.length, max),
          truncated,
          rows: rows.slice(0, max),
        });
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    'explain_query',
    'EXPLAIN de um SELECT para análise de performance.',
    { query: z.string().describe('SELECT a analisar') },
    async ({ query }) => {
      try {
        const plan = await runExplain(query);
        return textResult({ plan });
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
