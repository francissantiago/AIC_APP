import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@admin.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'S3nh@Forte!', minLength: 1 })
  @IsString()
  @MinLength(1)
  password!: string;
}
