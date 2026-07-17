import { toKebabCase, toPascalCase } from '../utils.js';
import type { BlueprintFile } from './frontend-component.js';

function toCamelFromKebab(kebab: string): string {
  return kebab.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

export function buildNestModuleBlueprint(name: string): {
  files: BlueprintFile[];
  notes: string[];
} {
  const kebab = toKebabCase(name);
  const pascal = toPascalCase(name);
  const camel = toCamelFromKebab(kebab);
  const baseDir = `backend/src/${kebab}`;

  const service = `import { Injectable } from '@nestjs/common';

@Injectable()
export class ${pascal}Service {
  findAll() {
    return {
      items: [],
      timestamp: new Date().toISOString(),
    };
  }
}
`;

  const controller = `import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ${pascal}Service } from './${kebab}.service';

@ApiTags('${kebab}')
@Controller('${kebab}')
export class ${pascal}Controller {
  constructor(private readonly ${camel}Service: ${pascal}Service) {}

  @Get()
  @ApiOperation({ summary: 'Listar ${kebab}' })
  @ApiOkResponse({ description: 'Lista retornada com sucesso' })
  findAll() {
    return this.${camel}Service.findAll();
  }
}
`;

  const module = `import { Module } from '@nestjs/common';
import { ${pascal}Controller } from './${kebab}.controller';
import { ${pascal}Service } from './${kebab}.service';

@Module({
  controllers: [${pascal}Controller],
  providers: [${pascal}Service],
  exports: [${pascal}Service],
})
export class ${pascal}Module {}
`;

  return {
    files: [
      { path: `${baseDir}/${kebab}.service.ts`, content: service },
      { path: `${baseDir}/${kebab}.controller.ts`, content: controller },
      { path: `${baseDir}/${kebab}.module.ts`, content: module },
    ],
    notes: [
      'Padrão baseado em backend/src/health/',
      'Documentar endpoints com @ApiTags / @ApiOperation / @ApiOkResponse',
      `Importar ${pascal}Module em backend/src/app.module.ts`,
      'Rotas ficam sob o prefixo global /api (main.ts)',
      'Não usar synchronize: true — preferir migrations TypeORM',
    ],
  };
}

export function buildNestEntityBlueprint(
  name: string,
  tableName?: string,
): {
  files: BlueprintFile[];
  notes: string[];
} {
  const kebab = toKebabCase(name);
  const pascal = toPascalCase(name);
  const table = tableName || `${kebab.replace(/-/g, '_')}s`;

  const entity = `import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: '${table}' })
export class ${pascal} {
  @PrimaryGeneratedColumn({ name: '${table}_id' })
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
`;

  return {
    files: [
      {
        path: `backend/src/${kebab}/${kebab}.entity.ts`,
        content: entity,
      },
    ],
    notes: [
      'synchronize permanece false no AppModule — criar migration para a tabela',
      'Ajustar nomes de colunas ao schema real (use get_table_schema do MCP)',
      `Registrar entity via TypeOrmModule.forFeature([${pascal}]) no módulo correspondente`,
      'Não inventar colunas: confirme no MySQL antes de commitar a entity',
    ],
  };
}
