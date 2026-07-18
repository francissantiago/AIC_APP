import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { AssetStatus, AssetType } from '../enums/asset.enums';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

const MAX_MONEY = 99_999_999_999.99;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

class PaginationDto {
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
}

export class CreateAssetDto {
  @ApiPropertyOptional({ nullable: true, maxLength: 50 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(50)
  assetTag?: string | null;

  @ApiProperty({ maxLength: 150 })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name!: string;

  @ApiProperty({ enum: AssetType })
  @IsEnum(AssetType)
  type!: AssetType;

  @ApiPropertyOptional({ nullable: true, format: 'date' })
  @IsOptional()
  @Matches(ISO_DATE_PATTERN)
  @IsDateString({ strict: true })
  acquisitionDate?: string | null;

  @ApiPropertyOptional({ nullable: true, minimum: 0.01 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(MAX_MONEY)
  acquisitionValue?: number | null;

  @ApiPropertyOptional({ nullable: true, minimum: 0.01 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(MAX_MONEY)
  currentValue?: number | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 150 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(150)
  location?: string | null;

  @ApiProperty({ enum: AssetStatus, default: AssetStatus.ACTIVE })
  @IsEnum(AssetStatus)
  status: AssetStatus = AssetStatus.ACTIVE;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(65535)
  notes?: string | null;
}

export class UpdateAssetDto extends PartialType(CreateAssetDto) {}

export class QueryAssetsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: AssetType })
  @IsOptional()
  @IsEnum(AssetType)
  type?: AssetType;

  @ApiPropertyOptional({ enum: AssetStatus })
  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  q?: string;
}

export class AssetResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty({ format: 'uuid' })
  createdByUserId!: string;
  @ApiPropertyOptional({ nullable: true })
  assetTag!: string | null;
  @ApiProperty()
  name!: string;
  @ApiProperty({ enum: AssetType })
  type!: AssetType;
  @ApiPropertyOptional({ nullable: true, format: 'date' })
  acquisitionDate!: string | null;
  @ApiPropertyOptional({ nullable: true, example: '5000.00' })
  acquisitionValue!: string | null;
  @ApiPropertyOptional({ nullable: true, example: '4500.00' })
  currentValue!: string | null;
  @ApiPropertyOptional({ nullable: true })
  location!: string | null;
  @ApiProperty({ enum: AssetStatus })
  status!: AssetStatus;
  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;
  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}

export class PaginatedAssetsResponseDto {
  @ApiProperty({ type: AssetResponseDto, isArray: true })
  data!: AssetResponseDto[];
  @ApiProperty()
  total!: number;
  @ApiProperty()
  page!: number;
  @ApiProperty()
  limit!: number;
}

export class AssetReportResponseDto extends PaginatedAssetsResponseDto {
  @ApiProperty()
  quantity!: number;
  @ApiProperty({ example: '25000.00' })
  estimatedValue!: string;
}

export class AssetDashboardTotalsDto {
  activeAssets!: number;
  estimatedAssetValue!: string;
}
