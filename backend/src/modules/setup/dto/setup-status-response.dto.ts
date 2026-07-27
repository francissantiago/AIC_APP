import { ApiProperty } from '@nestjs/swagger';

export class SetupStatusResponseDto {
  @ApiProperty({
    example: true,
    description:
      'true quando não existe nenhum usuário ativo (deleted_at IS NULL) na instalação',
  })
  needsSetup!: boolean;
}
