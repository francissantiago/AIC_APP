import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';

/**
 * DataSource standalone para a CLI do TypeORM (migrations).
 * Lê as mesmas variáveis DB_* do .env usadas pelo AppModule.
 * synchronize: false é inegociável — schema muda apenas via migrations.
 */
export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '3306', 10),
  username: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'db_aic',
  entities: ['src/**/entities/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  logging: false,
});
