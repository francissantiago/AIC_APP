/**
 * Ensures SQL is read-only before execution.
 * Allows: SELECT, WITH...SELECT, SHOW, DESCRIBE/DESC, EXPLAIN [SELECT]
 */

const MULTI_FORBIDDEN =
  /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|REPLACE|CALL|LOAD|GRANT|REVOKE|LOCK|UNLOCK|RENAME|MERGE|PREPARE|EXECUTE|DEALLOCATE|COMMIT|ROLLBACK|SAVEPOINT)\b/i;

const ALLOWED_START =
  /^(WITH\b[\s\S]+\bSELECT\b|SELECT\b|SHOW\b|DESCRIBE\b|DESC\b|EXPLAIN\b)/i;

function stripComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ')
    .replace(/#[^\n]*/g, ' ')
    .trim();
}

function stripStringLiterals(sql: string): string {
  return sql.replace(/'([^']|'')*'/g, "''").replace(/"([^"]|"")*"/g, '""');
}

export function assertReadOnlySql(sql: string): string {
  const cleaned = stripComments(sql);

  if (!cleaned) {
    throw new Error('SQL vazio.');
  }

  const withoutTrailingSemi = cleaned.replace(/;+\s*$/, '').trim();

  if (withoutTrailingSemi.includes(';')) {
    throw new Error('Multi-statement SQL não é permitido. Envie uma única query.');
  }

  if (!ALLOWED_START.test(withoutTrailingSemi)) {
    throw new Error(
      'Apenas queries de leitura são permitidas (SELECT, WITH…SELECT, SHOW, DESCRIBE, EXPLAIN).',
    );
  }

  const forScan = stripStringLiterals(withoutTrailingSemi);

  // SHOW may include CREATE (SHOW CREATE TABLE) — allow SHOW entirely
  if (/^SHOW\b/i.test(withoutTrailingSemi)) {
    return withoutTrailingSemi;
  }

  // EXPLAIN must wrap a SELECT / WITH
  if (/^EXPLAIN\b/i.test(withoutTrailingSemi)) {
    const inner = withoutTrailingSemi.replace(/^EXPLAIN\s+/i, '').trim();
    if (!/^(WITH\b|SELECT\b)/i.test(inner)) {
      throw new Error('EXPLAIN só é permitido sobre SELECT (ou WITH…SELECT).');
    }
    if (MULTI_FORBIDDEN.test(stripStringLiterals(inner))) {
      throw new Error(
        'SQL rejeitado: contém palavras-chave de escrita/DDL. Este MCP é somente-SELECT.',
      );
    }
    return withoutTrailingSemi;
  }

  if (MULTI_FORBIDDEN.test(forScan)) {
    throw new Error(
      'SQL rejeitado: contém palavras-chave de escrita/DDL. Este MCP é somente-SELECT.',
    );
  }

  return withoutTrailingSemi;
}

export function assertSelectForExplain(sql: string): string {
  const cleaned = assertReadOnlySql(sql);
  const inner = cleaned.replace(/^EXPLAIN\s+/i, '').trim();
  if (!/^(WITH\b|SELECT\b)/i.test(inner)) {
    throw new Error('explain_query aceita apenas SELECT (ou WITH…SELECT).');
  }
  return inner;
}
