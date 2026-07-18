import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class TwoFactorCodeDto {
  @ApiProperty({ example: '123456', description: 'Código TOTP de 6 dígitos' })
  @Matches(/^\d{6}$/, { message: 'code deve ter exatamente 6 dígitos' })
  code!: string;
}
