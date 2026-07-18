import { ApiProperty } from '@nestjs/swagger';
import { SmallGroupMember } from '../entities/small-group-member.entity';
import { SmallGroupMemberRole } from '../enums/small-group-member-role.enum';
import { SmallGroupMemberStatus } from '../enums/small-group-member-status.enum';

export class SmallGroupMemberResponseDto {
  @ApiProperty({ example: '4f6c1c1e-4a5b-4f0e-9d2a-9a3b8c7d6e5f' })
  smallGroupId!: string;

  @ApiProperty({ example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' })
  memberId!: string;

  @ApiProperty({ example: 'Maria da Silva' })
  memberFullName!: string;

  @ApiProperty({ enum: SmallGroupMemberRole })
  role!: SmallGroupMemberRole;

  @ApiProperty({ enum: SmallGroupMemberStatus })
  status!: SmallGroupMemberStatus;

  @ApiProperty()
  joinedAt!: Date;

  static fromEntity(link: SmallGroupMember): SmallGroupMemberResponseDto {
    const dto = new SmallGroupMemberResponseDto();
    dto.smallGroupId = link.smallGroupId;
    dto.memberId = link.memberId;
    dto.memberFullName = link.member?.fullName ?? '';
    dto.role = link.role;
    dto.status = link.status;
    dto.joinedAt = link.joinedAt;
    return dto;
  }
}

export class PaginatedSmallGroupMembersResponseDto {
  @ApiProperty({ type: SmallGroupMemberResponseDto, isArray: true })
  data!: SmallGroupMemberResponseDto[];

  @ApiProperty({ example: 12 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;
}

export class SmallGroupMemberOptionDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  fullName!: string;
}
