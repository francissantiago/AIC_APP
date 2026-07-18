import { ApiProperty } from '@nestjs/swagger';
import { AnnouncementResponseDto } from './announcement-response.dto';

export class PaginatedAnnouncementsResponseDto {
  @ApiProperty({ type: AnnouncementResponseDto, isArray: true })
  data!: AnnouncementResponseDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;
}

export class AnnouncementsBoardResponseDto {
  @ApiProperty({ type: AnnouncementResponseDto, isArray: true })
  data!: AnnouncementResponseDto[];
}
