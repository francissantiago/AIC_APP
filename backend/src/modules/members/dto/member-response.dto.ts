import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Member } from '../entities/member.entity';
import { MemberGender } from '../enums/member-gender.enum';
import { MemberMaritalStatus } from '../enums/member-marital-status.enum';
import { MemberStatus } from '../enums/member-status.enum';

export class MemberResponseDto {
  @ApiProperty({ example: '4f6c1c1e-4a5b-4f0e-9d2a-9a3b8c7d6e5f' })
  id!: string;

  @ApiProperty({ example: 'Maria da Silva' })
  fullName!: string;

  @ApiPropertyOptional({ example: 'maria.silva@igreja.org', nullable: true })
  email!: string | null;

  @ApiPropertyOptional({ example: '+5511999999999', nullable: true })
  phone!: string | null;

  @ApiPropertyOptional({ example: '12345678900', nullable: true })
  document!: string | null;

  @ApiPropertyOptional({ example: '1990-05-20', nullable: true })
  birthDate!: string | null;

  @ApiProperty({ enum: MemberGender, example: MemberGender.UNSPECIFIED })
  gender!: MemberGender;

  @ApiProperty({
    enum: MemberMaritalStatus,
    example: MemberMaritalStatus.OTHER,
  })
  maritalStatus!: MemberMaritalStatus;

  @ApiProperty({ enum: MemberStatus, example: MemberStatus.ACTIVE })
  status!: MemberStatus;

  @ApiPropertyOptional({ example: '2010-08-15', nullable: true })
  baptismDate!: string | null;

  @ApiPropertyOptional({ example: '2012-01-10', nullable: true })
  membershipDate!: string | null;

  @ApiPropertyOptional({ example: 'Rua das Flores, 100', nullable: true })
  address!: string | null;

  @ApiPropertyOptional({ example: 'São Paulo', nullable: true })
  city!: string | null;

  @ApiPropertyOptional({ example: 'SP', nullable: true })
  state!: string | null;

  @ApiPropertyOptional({ example: '01310-100', nullable: true })
  zipCode!: string | null;

  @ApiPropertyOptional({ example: 'Observações pastorais', nullable: true })
  notes!: string | null;

  @ApiPropertyOptional({ example: '12.345.678-9', nullable: true })
  rg!: string | null;

  @ApiPropertyOptional({
    example: '000239',
    nullable: true,
    description:
      'Número de registro sequencial (6 dígitos). Gerado automaticamente na criação.',
  })
  registrationNumber!: string | null;

  @ApiPropertyOptional({ example: 'São Paulo / SP', nullable: true })
  placeOfBirth!: string | null;

  @ApiPropertyOptional({ example: 'O+', nullable: true })
  bloodType!: string | null;

  @ApiPropertyOptional({ example: 'José da Silva', nullable: true })
  fatherName!: string | null;

  @ApiPropertyOptional({ example: 'Ana da Silva', nullable: true })
  motherName!: string | null;

  @ApiPropertyOptional({ example: 'Diácono', nullable: true })
  positionTitle!: string | null;

  @ApiPropertyOptional({
    example: '/api/members/4f6c1c1e-4a5b-4f0e-9d2a-9a3b8c7d6e5f/photo',
    nullable: true,
    description: 'URL relativa autenticada da foto do membro',
  })
  photoUrl!: string | null;

  @ApiProperty({
    example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    description: 'ID da congregação-base (somente leitura)',
  })
  congregationId!: string;

  @ApiPropertyOptional({
    example: '4f6c1c1e-4a5b-4f0e-9d2a-9a3b8c7d6e5f',
    nullable: true,
  })
  userId!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromEntity(member: Member): MemberResponseDto {
    const dto = new MemberResponseDto();
    dto.id = member.id;
    dto.fullName = member.fullName;
    dto.email = member.email;
    dto.phone = member.phone;
    dto.document = member.document;
    dto.birthDate = member.birthDate;
    dto.gender = member.gender;
    dto.maritalStatus = member.maritalStatus;
    dto.status = member.status;
    dto.baptismDate = member.baptismDate;
    dto.membershipDate = member.membershipDate;
    dto.address = member.address;
    dto.city = member.city;
    dto.state = member.state;
    dto.zipCode = member.zipCode;
    dto.notes = member.notes;
    dto.rg = member.rg;
    dto.registrationNumber = member.registrationNumber;
    dto.placeOfBirth = member.placeOfBirth;
    dto.bloodType = member.bloodType;
    dto.fatherName = member.fatherName;
    dto.motherName = member.motherName;
    dto.positionTitle = member.positionTitle;
    dto.photoUrl = member.photoPath ? `/api/members/${member.id}/photo` : null;
    dto.congregationId = member.congregationId;
    dto.userId = member.userId;
    dto.createdAt = member.createdAt;
    dto.updatedAt = member.updatedAt;
    return dto;
  }
}

export class PaginatedMembersResponseDto {
  @ApiProperty({ type: MemberResponseDto, isArray: true })
  data!: MemberResponseDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;
}
