import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

const toBoolean = ({ value }: { value: unknown }): unknown =>
  value === true || value === 'true'
    ? true
    : value === false || value === 'false'
      ? false
      : value;

export class BulkUpsertAssignmentItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  memberId!: string;

  @ApiProperty({ example: 'Porta', minLength: 1, maxLength: 80 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(80)
  roleLabel!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  confirmed?: boolean;

  @ApiPropertyOptional({ nullable: true, maxLength: 255 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  notes?: string | null;
}

export class BulkUpsertAssignmentsDto {
  @ApiProperty({ type: BulkUpsertAssignmentItemDto, isArray: true })
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => BulkUpsertAssignmentItemDto)
  items!: BulkUpsertAssignmentItemDto[];
}
