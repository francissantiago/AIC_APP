import { ApiProperty } from '@nestjs/swagger';

export class CreatedByUserSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  fullName!: string;
}
