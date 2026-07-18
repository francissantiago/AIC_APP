import { ApiProperty } from '@nestjs/swagger';
import { FamilyRelation } from '../enums/family-relation.enum';

export class BirthdayReportItemDto {
  @ApiProperty({ example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' })
  memberId!: string;

  @ApiProperty({ example: 'Maria da Silva' })
  fullName!: string;

  @ApiProperty({ example: '1990-05-12' })
  birthDate!: string;

  @ApiProperty({ example: '4f6c1c1e-4a5b-4f0e-9d2a-9a3b8c7d6e5f' })
  familyId!: string;

  @ApiProperty({ example: 'Família Silva' })
  familyName!: string;

  @ApiProperty({ enum: FamilyRelation })
  relation!: FamilyRelation;

  @ApiProperty({ example: 12, description: 'Dia do mês (para ordenação)' })
  day!: number;
}

export class BirthdayReportResponseDto {
  @ApiProperty({ type: BirthdayReportItemDto, isArray: true })
  data!: BirthdayReportItemDto[];
}
