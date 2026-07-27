import { ApiProperty } from '@nestjs/swagger';
import { Congregation } from '../../congregations/entities/congregation.entity';
import { CongregationType } from '../../congregations/enums/congregation-type.enum';
import { User } from '../../users/entities/user.entity';

export class SetupUserResponseDto {
  @ApiProperty({ example: '4f6c1c1e-4a5b-4f0e-9d2a-9a3b8c7d6e5f' })
  id!: string;

  @ApiProperty({ example: 'admin' })
  username!: string;

  @ApiProperty({ example: 'admin@igreja.org' })
  email!: string;

  @ApiProperty({ example: 'Administrador Geral' })
  fullName!: string;
}

export class SetupCongregationResponseDto {
  @ApiProperty({ example: '7c4b835d-3342-467b-a94b-2e464036b138' })
  id!: string;

  @ApiProperty({ example: 'Igreja Central AIC' })
  name!: string;

  @ApiProperty({
    enum: CongregationType,
    example: CongregationType.HEADQUARTERS,
  })
  type!: CongregationType;
}

export class CompleteSetupResponseDto {
  @ApiProperty({
    example: false,
    description: 'Sempre false após a conclusão do setup',
  })
  needsSetup!: boolean;

  @ApiProperty({ type: SetupUserResponseDto })
  user!: SetupUserResponseDto;

  @ApiProperty({ type: SetupCongregationResponseDto })
  congregation!: SetupCongregationResponseDto;

  static fromEntities(
    user: User,
    congregation: Congregation,
  ): CompleteSetupResponseDto {
    const dto = new CompleteSetupResponseDto();
    dto.needsSetup = false;
    dto.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
    };
    dto.congregation = {
      id: congregation.id,
      name: congregation.name,
      type: congregation.type,
    };
    return dto;
  }
}
