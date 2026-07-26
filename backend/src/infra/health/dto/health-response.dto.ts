import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: string;

  @ApiProperty({ example: '2026-07-26T18:00:00.000Z' })
  timestamp!: string;

  @ApiProperty({ example: '1.0.1', description: 'Versão da API em execução' })
  version!: string;
}
