import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Congregation } from '../entities/congregation.entity';
import { CongregationStatus } from '../enums/congregation-status.enum';
import { CongregationType } from '../enums/congregation-type.enum';

export class CongregationResponseDto {
  @ApiProperty({ example: '4f6c1c1e-4a5b-4f0e-9d2a-9a3b8c7d6e5f' })
  id!: string;

  @ApiProperty({ example: 'Igreja Central AIC' })
  name!: string;

  @ApiPropertyOptional({ example: 'AIC Central', nullable: true })
  tradeName!: string | null;

  @ApiProperty({
    enum: CongregationType,
    example: CongregationType.HEADQUARTERS,
  })
  type!: CongregationType;

  @ApiPropertyOptional({
    example: '7c4b835d-3342-467b-a94b-2e464036b138',
    nullable: true,
  })
  parentId!: string | null;

  @ApiPropertyOptional({ example: '12.345.678/0001-99', nullable: true })
  document!: string | null;

  @ApiPropertyOptional({ example: 'contato@aic.org', nullable: true })
  email!: string | null;

  @ApiPropertyOptional({ example: '+551133334444', nullable: true })
  phone!: string | null;

  @ApiPropertyOptional({ example: 'Av. Paulista, 1000', nullable: true })
  address!: string | null;

  @ApiPropertyOptional({ example: 'São Paulo', nullable: true })
  city!: string | null;

  @ApiPropertyOptional({ example: 'SP', nullable: true })
  state!: string | null;

  @ApiPropertyOptional({ example: '01310-100', nullable: true })
  zipCode!: string | null;

  @ApiPropertyOptional({ example: '1990-03-15', nullable: true })
  foundationDate!: string | null;

  @ApiPropertyOptional({ example: 'https://www.aic.org', nullable: true })
  website!: string | null;

  @ApiProperty({ enum: CongregationStatus, example: CongregationStatus.ACTIVE })
  status!: CongregationStatus;

  @ApiPropertyOptional({
    example: 'Congregação sede administrativa',
    nullable: true,
  })
  notes!: string | null;

  @ApiPropertyOptional({
    example: 2,
    description: 'Só populado quando type=headquarters',
  })
  branchesCount?: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromEntity(
    congregation: Congregation,
    options?: { branchesCount?: number },
  ): CongregationResponseDto {
    const dto = new CongregationResponseDto();
    dto.id = congregation.id;
    dto.name = congregation.name;
    dto.tradeName = congregation.tradeName;
    dto.type = congregation.type;
    dto.parentId = congregation.parentId;
    dto.document = congregation.document;
    dto.email = congregation.email;
    dto.phone = congregation.phone;
    dto.address = congregation.address;
    dto.city = congregation.city;
    dto.state = congregation.state;
    dto.zipCode = congregation.zipCode;
    dto.foundationDate = congregation.foundationDate;
    dto.website = congregation.website;
    dto.status = congregation.status;
    dto.notes = congregation.notes;
    dto.createdAt = congregation.createdAt;
    dto.updatedAt = congregation.updatedAt;
    if (options?.branchesCount !== undefined) {
      dto.branchesCount = options.branchesCount;
    }
    return dto;
  }
}

export class PaginatedCongregationsResponseDto {
  @ApiProperty({ type: CongregationResponseDto, isArray: true })
  data!: CongregationResponseDto[];

  @ApiProperty({ example: 2 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;
}
