import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class DisableTwoFactorDto {
  @ApiProperty({ example: 'S3nh@Forte!' })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiProperty({ example: '123456', description: 'Código TOTP de 6 dígitos' })
  @Matches(/^\d{6}$/, { message: 'code deve ter exatamente 6 dígitos' })
  code!: string;
}
