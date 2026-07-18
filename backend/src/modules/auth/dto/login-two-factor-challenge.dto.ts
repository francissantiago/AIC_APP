import { ApiProperty } from '@nestjs/swagger';

export class LoginTwoFactorChallengeDto {
  @ApiProperty({ example: true, enum: [true] })
  requiresTwoFactor!: true;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT curto para concluir login em POST /auth/login/2fa',
  })
  preAuthToken!: string;

  @ApiProperty({ example: '5m', enum: ['5m'] })
  expiresIn!: '5m';
}
