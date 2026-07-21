import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';

const MAX_BATCH = 50;

function parseMemberIds(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return [];
}

export class MembershipCardBatchQueryDto {
  @ApiPropertyOptional({
    description: 'IDs dos membros (CSV ou array repetido). Máximo de 50 itens.',
    example:
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee,bbbbbbbb-cccc-dddd-eeee-ffffffffffff',
  })
  @Transform(({ value }) => parseMemberIds(value))
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_BATCH)
  @IsUUID('4', { each: true })
  memberIds!: string[];
}
