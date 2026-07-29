import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ReportScope } from '../enums/report-scope.enum';

export class ReportScopeQueryDto {
  @ApiPropertyOptional({
    enum: ReportScope,
    default: ReportScope.LOCAL,
    description:
      'Escopo do relatório: local (congregação ativa) ou consolidated (sede + filiais ativas; apenas na HQ)',
  })
  @IsOptional()
  @IsEnum(ReportScope)
  scope?: ReportScope;
}
