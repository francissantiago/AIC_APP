import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class LoginTwoFactorDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT curto com purpose=2fa (expiresIn 5m)',
  })
  @IsString()
  @IsNotEmpty()
  preAuthToken!: string;

  @ApiProperty({ example: '123456', description: 'Código TOTP de 6 dígitos' })
  @Matches(/^\d{6}$/, { message: 'code deve ter exatamente 6 dígitos' })
  code!: string;
}
