import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SetupTwoFactorDto {
  @ApiProperty({ example: 'S3nh@Forte!' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
