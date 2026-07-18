import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'S3nh@Atual!' })
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty({
    example: 'S3nh@Nova!',
    minLength: 8,
    maxLength: 72,
    description: 'Paridade com CreateUserDto.password',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword!: string;
}
