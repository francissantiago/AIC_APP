import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  PASSWORD_COMPLEXITY_MESSAGE,
  PASSWORD_COMPLEXITY_REGEX,
} from '../../../common/validation/password.constants';

export class ChangePasswordDto {
  @ApiProperty({ example: 'S3nh@Atual!' })
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty({
    example: 'S3nh@Nova!',
    minLength: 8,
    maxLength: 72,
    description: 'Paridade com CreateUserDto.password — AIC-SEC-014',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(PASSWORD_COMPLEXITY_REGEX, {
    message: PASSWORD_COMPLEXITY_MESSAGE,
  })
  newPassword!: string;
}
