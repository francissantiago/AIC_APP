import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MemberMaritalStatus } from '../../members/enums/member-marital-status.enum';

export class MembershipCardFrontDto {
  @ApiProperty()
  fullName!: string;

  @ApiPropertyOptional({ nullable: true })
  filiation!: string | null;

  @ApiPropertyOptional({ nullable: true })
  birthDate!: string | null;

  @ApiPropertyOptional({ nullable: true })
  placeOfBirth!: string | null;

  @ApiPropertyOptional({ nullable: true })
  positionTitle!: string | null;

  @ApiPropertyOptional({ nullable: true })
  bloodType!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Número de registro sequencial do membro (6 dígitos, ex.: 000239)',
  })
  registrationNumber!: string | null;

  @ApiPropertyOptional({ nullable: true })
  photoUrl!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Data URL (base64) da foto para preview/impressão sem GET binário',
  })
  photoDataUrl!: string | null;
}

export class MembershipCardBackDto {
  @ApiPropertyOptional({
    nullable: true,
    description: 'CPF (members.document)',
  })
  cpf!: string | null;

  @ApiPropertyOptional({ nullable: true })
  rg!: string | null;

  @ApiProperty({ enum: MemberMaritalStatus })
  maritalStatus!: MemberMaritalStatus;

  @ApiProperty()
  validUntil!: string;

  @ApiProperty({
    description: 'URL pública de validação embutida no QR Code',
  })
  verificationUrl!: string;

  @ApiProperty({
    description: 'Data URL (PNG base64) do QR Code de validação',
  })
  qrCodeDataUrl!: string;
}

export class MembershipCardInstitutionDto {
  @ApiProperty()
  headerLine1!: string;

  @ApiPropertyOptional({ nullable: true })
  headerLine2!: string | null;

  @ApiPropertyOptional({ nullable: true })
  ministryLabel!: string | null;

  @ApiPropertyOptional({ nullable: true })
  presidentName!: string | null;

  @ApiProperty()
  presidentTitle!: string;

  @ApiPropertyOptional({ nullable: true })
  logoUrl!: string | null;

  @ApiPropertyOptional({ nullable: true })
  signatureUrl!: string | null;

  @ApiProperty()
  footerNotice!: string;
}

export class MembershipCardResponseDto {
  @ApiProperty()
  memberId!: string;

  @ApiProperty({ description: 'Data de emissão (ISO date)' })
  issuedAt!: string;

  @ApiProperty({ description: 'Validade calculada (ISO date)' })
  validUntil!: string;

  @ApiProperty({ type: MembershipCardFrontDto })
  front!: MembershipCardFrontDto;

  @ApiProperty({ type: MembershipCardBackDto })
  back!: MembershipCardBackDto;

  @ApiProperty({ type: MembershipCardInstitutionDto })
  institution!: MembershipCardInstitutionDto;

  @ApiProperty({
    type: [String],
    example: ['photo', 'rg'],
    description: 'Campos vazios úteis ao UI',
  })
  missingFields!: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['inactive_member'],
    description: 'Avisos não bloqueantes',
  })
  warnings!: string[];
}
