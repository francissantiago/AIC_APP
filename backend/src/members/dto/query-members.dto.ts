import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MemberGender } from '../enums/member-gender.enum';
import { MemberStatus } from '../enums/member-status.enum';

export class QueryMembersDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({ enum: MemberStatus })
  @IsOptional()
  @IsEnum(MemberStatus)
  status?: MemberStatus;

  @ApiPropertyOptional({ enum: MemberGender })
  @IsOptional()
  @IsEnum(MemberGender)
  gender?: MemberGender;

  @ApiPropertyOptional({
    example: 'silva',
    description: 'Busca em full_name, email, document e phone',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  q?: string;
}
