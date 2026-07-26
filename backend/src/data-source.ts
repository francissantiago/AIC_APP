import 'reflect-metadata';
import { DataSource } from 'typeorm';

/**
 * DataSource standalone para a CLI do TypeORM (migrations).
 * Lê as mesmas variáveis DB_* do .env usadas pelo AppModule.
 * synchronize: false é inegociável — schema muda apenas via migrations.
 *
 * Em Docker/produção: TYPEORM_USE_DIST=1 aponta para artefatos compilados em dist/.
 * Em desenvolvimento local, carrega `.env` se `dotenv` estiver disponível.
 */
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv').config();
} catch {
  // Docker injeta DB_* via environment; dotenv é opcional
}

const useDist = process.env.TYPEORM_USE_DIST === '1';

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '3306', 10),
  username: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'db_aic',
  entities: useDist
    ? ['dist/**/*.entity.js']
    : ['src/**/entities/*.entity.ts'],
  migrations: useDist
    ? ['dist/migrations/*.js']
    : ['src/migrations/*.ts'],
  synchronize: false,
  logging: false,
});
