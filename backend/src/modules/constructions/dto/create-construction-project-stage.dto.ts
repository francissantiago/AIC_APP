import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateConstructionProjectStageDto {
  @ApiProperty({ example: 'Fundação', minLength: 1, maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(120)
  title!: string;
}
