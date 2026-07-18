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

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromEntity(congregation: Congregation): CongregationResponseDto {
    const dto = new CongregationResponseDto();
    dto.id = congregation.id;
    dto.name = congregation.name;
    dto.tradeName = congregation.tradeName;
    dto.type = congregation.type;
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
    return dto;
  }
}
