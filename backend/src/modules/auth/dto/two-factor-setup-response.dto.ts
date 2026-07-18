import { ApiProperty } from '@nestjs/swagger';

export class TwoFactorSetupResponseDto {
  @ApiProperty({
    example: 'otpauth://totp/AIC:admin%40admin.com?secret=ABC&issuer=AIC',
  })
  otpauthUrl!: string;

  @ApiProperty({
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
    description: 'QR code como data URL PNG',
  })
  qrCodeDataUrl!: string;

  @ApiProperty({
    example: 'JBSWY3DPEHPK3PXP',
    description: 'Secret para entrada manual no authenticator',
  })
  secret!: string;
}
