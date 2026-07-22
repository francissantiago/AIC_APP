import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MemberStatus } from '../../members/enums/member-status.enum';

export class MembershipCardVerifyResponseDto {
  @ApiProperty({ description: 'Indica se o membro foi encontrado e é válido' })
  valid!: boolean;

  @ApiPropertyOptional({ nullable: true })
  memberId!: string | null;

  @ApiPropertyOptional({ nullable: true, example: '000239' })
  registrationNumber!: string | null;

  @ApiPropertyOptional({ nullable: true })
  fullName!: string | null;

  @ApiPropertyOptional({ enum: MemberStatus, nullable: true })
  status!: MemberStatus | null;

  @ApiPropertyOptional({ nullable: true })
  congregationName!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Data de nascimento (ISO date)',
  })
  birthDate!: string | null;

  @ApiPropertyOptional({ nullable: true })
  message!: string | null;
}
