import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: string;

  @ApiPropertyOptional({
    example: '2026-07-26T18:00:00.000Z',
    description: 'Omitido em produção (AIC-SEC-022)',
  })
  timestamp?: string;

  @ApiPropertyOptional({
    example: '1.0.1',
    description: 'Versão da API — omitida em produção (AIC-SEC-022)',
  })
  version?: string;
}
