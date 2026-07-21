import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MembershipCardSettings } from '../entities/membership-card-settings.entity';

export class MembershipCardSettingsResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  congregationId!: string;

  @ApiProperty({ example: 'Igreja Pentecostal' })
  headerLine1!: string;

  @ApiPropertyOptional({ nullable: true })
  headerLine2!: string | null;

  @ApiPropertyOptional({ nullable: true })
  ministryLabel!: string | null;

  @ApiPropertyOptional({ nullable: true })
  presidentName!: string | null;

  @ApiProperty({ example: 'PASTORA PRESIDENTE' })
  presidentTitle!: string;

  @ApiPropertyOptional({
    nullable: true,
    example: '/api/membership-cards/settings/logo',
  })
  logoUrl!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: '/api/membership-cards/settings/signature',
  })
  signatureUrl!: string | null;

  @ApiProperty({ example: 24 })
  validityMonths!: number;

  @ApiProperty()
  footerNotice!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromEntity(
    settings: MembershipCardSettings,
  ): MembershipCardSettingsResponseDto {
    const dto = new MembershipCardSettingsResponseDto();
    dto.id = settings.id;
    dto.congregationId = settings.congregationId;
    dto.headerLine1 = settings.headerLine1;
    dto.headerLine2 = settings.headerLine2;
    dto.ministryLabel = settings.ministryLabel;
    dto.presidentName = settings.presidentName;
    dto.presidentTitle = settings.presidentTitle;
    dto.logoUrl = settings.logoPath
      ? '/api/membership-cards/settings/logo'
      : null;
    dto.signatureUrl = settings.signaturePath
      ? '/api/membership-cards/settings/signature'
      : null;
    dto.validityMonths = settings.validityMonths;
    dto.footerNotice = settings.footerNotice;
    dto.createdAt = settings.createdAt;
    dto.updatedAt = settings.updatedAt;
    return dto;
  }
}
