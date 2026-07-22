import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type FamilyLinkSkippedReason =
  | 'PARENTS_IN_DIFFERENT_FAMILIES'
  | 'CHILD_IN_OTHER_FAMILY'
  | 'MEMBER_ALREADY_IN_OTHER_FAMILY';

export class FamilyLinkResultDto {
  @ApiProperty({
    description: 'Se a orquestração familiar foi tentada',
  })
  attempted!: boolean;

  @ApiProperty({
    description: 'Se a família foi criada/vinculada com sucesso',
  })
  linked!: boolean;

  @ApiPropertyOptional({ format: 'uuid' })
  familyId?: string;

  @ApiPropertyOptional({ example: 'Família Silva' })
  familyName?: string;

  @ApiPropertyOptional({
    example: 'PARENTS_IN_DIFFERENT_FAMILIES',
    description:
      'Motivo tipado quando a orquestração foi pulada sem falhar o save do membro',
  })
  skippedReason?: FamilyLinkSkippedReason;
}
