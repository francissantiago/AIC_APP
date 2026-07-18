import { ApiProperty } from '@nestjs/swagger';
import { MinistryMember } from '../entities/ministry-member.entity';
import { MinistryMemberRole } from '../enums/ministry-member-role.enum';

export class MinistryMemberResponseDto {
  @ApiProperty({ example: '4f6c1c1e-4a5b-4f0e-9d2a-9a3b8c7d6e5f' })
  ministryId!: string;

  @ApiProperty({ example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' })
  memberId!: string;

  @ApiProperty({ example: 'Maria da Silva' })
  memberFullName!: string;

  @ApiProperty({ enum: MinistryMemberRole })
  role!: MinistryMemberRole;

  @ApiProperty()
  joinedAt!: Date;

  static fromEntity(link: MinistryMember): MinistryMemberResponseDto {
    const dto = new MinistryMemberResponseDto();
    dto.ministryId = link.ministryId;
    dto.memberId = link.memberId;
    dto.memberFullName = link.member?.fullName ?? '';
    dto.role = link.role;
    dto.joinedAt = link.joinedAt;
    return dto;
  }
}

export class PaginatedMinistryMembersResponseDto {
  @ApiProperty({ type: MinistryMemberResponseDto, isArray: true })
  data!: MinistryMemberResponseDto[];

  @ApiProperty({ example: 12 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;
}
