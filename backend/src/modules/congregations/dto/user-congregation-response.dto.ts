import { ApiProperty } from '@nestjs/swagger';
import { CongregationType } from '../enums/congregation-type.enum';
import { UserCongregation } from '../entities/user-congregation.entity';

export class UserCongregationResponseDto {
  @ApiProperty({ example: '7c4b835d-3342-467b-a94b-2e464036b138' })
  congregationId!: string;

  @ApiProperty({ example: 'Igreja Central AIC' })
  congregationName!: string;

  @ApiProperty({
    enum: CongregationType,
    example: CongregationType.HEADQUARTERS,
  })
  congregationType!: CongregationType;

  @ApiProperty({ example: true })
  isDefault!: boolean;

  @ApiProperty()
  assignedAt!: Date;

  static fromEntity(membership: UserCongregation): UserCongregationResponseDto {
    const dto = new UserCongregationResponseDto();
    dto.congregationId = membership.congregationId;
    dto.congregationName = membership.congregation.name;
    dto.congregationType = membership.congregation.type;
    dto.isDefault = Boolean(membership.isDefault);
    dto.assignedAt = membership.assignedAt;
    return dto;
  }
}
