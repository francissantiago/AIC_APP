import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiErrorDetailDto {
  @ApiPropertyOptional({ example: 'email' })
  field?: string;

  @ApiProperty({ example: 'MEMBERS.EMAIL_IN_USE' })
  code!: string;

  @ApiProperty({ example: 'Este e-mail já está cadastrado.' })
  message!: string;
}

export class ApiErrorResponseDto {
  @ApiProperty({ example: 409 })
  statusCode!: number;

  @ApiProperty({ example: 'Conflict' })
  error!: string;

  @ApiProperty({ example: 'MEMBERS.EMAIL_IN_USE' })
  code!: string;

  @ApiProperty({ example: 'Este e-mail já está cadastrado.' })
  message!: string;

  @ApiPropertyOptional({ type: [ApiErrorDetailDto] })
  details?: ApiErrorDetailDto[];

  @ApiPropertyOptional({ example: 'AIC-E7F3A2B1' })
  traceId?: string;
}
