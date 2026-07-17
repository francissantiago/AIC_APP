import mysql, { type Pool, type RowDataPacket } from 'mysql2/promise';
import { dbConfig, QUERY_TIMEOUT_MS } from '../config.js';
import { assertReadOnlySql, assertSelectForExplain } from './select-guard.js';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      waitForConnections: true,
      connectionLimit: 5,
      enableKeepAlive: true,
      namedPlaceholders: false,
      multipleStatements: false,
    });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function runReadOnlyQuery(
  sql: string,
  params: unknown[] = [],
): Promise<{ rows: unknown[]; fields: string[] }> {
  const safeSql = assertReadOnlySql(sql);
  const p = getPool();
  const [rows, fields] = await Promise.race([
    p.query(safeSql, params),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Query timeout (${QUERY_TIMEOUT_MS}ms)`)),
        QUERY_TIMEOUT_MS,
      ),
    ),
  ]);

  const fieldNames = Array.isArray(fields)
    ? fields.map((f) => ('name' in f ? String(f.name) : ''))
    : [];

  return {
    rows: Array.isArray(rows) ? (rows as RowDataPacket[]) : [rows],
    fields: fieldNames.filter(Boolean),
  };
}

export async function runExplain(sql: string): Promise<unknown[]> {
  const selectSql = assertSelectForExplain(sql);
  const { rows } = await runReadOnlyQuery(`EXPLAIN ${selectSql}`);
  return rows;
}

export async function listTables(): Promise<string[]> {
  const { rows } = await runReadOnlyQuery(
    `SELECT TABLE_NAME AS name
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ?
     ORDER BY TABLE_NAME`,
    [dbConfig.database],
  );
  return (rows as Array<{ name: string }>).map((r) => r.name);
}

export async function getTableSchema(tableName: string): Promise<unknown[]> {
  assertIdentifier(tableName);
  const { rows } = await runReadOnlyQuery(
    `SELECT
       COLUMN_NAME AS columnName,
       COLUMN_TYPE AS columnType,
       IS_NULLABLE AS nullable,
       COLUMN_KEY AS columnKey,
       COLUMN_DEFAULT AS defaultValue,
       EXTRA AS extra,
       COLUMN_COMMENT AS comment
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
     ORDER BY ORDINAL_POSITION`,
    [dbConfig.database, tableName],
  );
  return rows;
}

export async function getTableRelations(tableName: string): Promise<unknown[]> {
  assertIdentifier(tableName);
  const { rows } = await runReadOnlyQuery(
    `SELECT
       CONSTRAINT_NAME AS constraintName,
       COLUMN_NAME AS columnName,
       REFERENCED_TABLE_NAME AS referencedTable,
       REFERENCED_COLUMN_NAME AS referencedColumn
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = ?
       AND REFERENCED_TABLE_NAME IS NOT NULL
     ORDER BY CONSTRAINT_NAME, ORDINAL_POSITION`,
    [dbConfig.database, tableName],
  );
  return rows;
}

function assertIdentifier(name: string): void {
  if (!/^[A-Za-z0-9_]+$/.test(name)) {
    throw new Error(`Nome de tabela inválido: ${name}`);
  }
}
