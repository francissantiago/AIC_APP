import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MemberGender } from '../enums/member-gender.enum';
import { MemberStatus } from '../enums/member-status.enum';

export class MemberOptionDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'José da Silva' })
  fullName!: string;

  @ApiPropertyOptional({ enum: MemberStatus })
  status?: MemberStatus;

  @ApiPropertyOptional({ enum: MemberGender })
  gender?: MemberGender;
}
