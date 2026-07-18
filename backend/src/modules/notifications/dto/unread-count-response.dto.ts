import { ApiProperty } from '@nestjs/swagger';

export class UnreadCountResponseDto {
  @ApiProperty({ example: 3 })
  count!: number;
}

export class MarkAllReadResponseDto {
  @ApiProperty({ example: 5 })
  updated!: number;
}
