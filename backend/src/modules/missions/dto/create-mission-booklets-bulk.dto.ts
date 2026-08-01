import { ApiProperty, OmitType } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';
import { CreateMissionBookletDto } from './create-mission-booklet.dto';
import { MissionBookletResponseDto } from './mission-booklet-response.dto';

export class CreateMissionBookletsBulkDto extends OmitType(
  CreateMissionBookletDto,
  ['memberId'] as const,
) {
  @ApiProperty({
    type: 'array',
    items: { type: 'string', format: 'uuid' },
    minItems: 1,
    maxItems: 50,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  memberIds!: string[];
}

export class BulkMissionBookletsResponseDto {
  @ApiProperty({ type: MissionBookletResponseDto, isArray: true })
  data!: MissionBookletResponseDto[];

  @ApiProperty()
  total!: number;
}
