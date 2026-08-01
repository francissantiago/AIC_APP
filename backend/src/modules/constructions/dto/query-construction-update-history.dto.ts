import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class QueryConstructionUpdateHistoryDto {
  @ApiProperty()
  @IsUUID()
  constructionProjectId!: string;
}
