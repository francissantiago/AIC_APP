import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DisableTwoFactorDto } from './dto/disable-two-factor.dto';
import { LoginTwoFactorChallengeDto } from './dto/login-two-factor-challenge.dto';
import { LoginTwoFactorDto } from './dto/login-two-factor.dto';
import { LoginDto } from './dto/login.dto';
import { TwoFactorCodeDto } from './dto/two-factor-code.dto';
import { TwoFactorSetupResponseDto } from './dto/two-factor-setup-response.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@ApiErrorResponses()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Autenticar com email e senha',
    description:
      'Retorna AuthResponseDto (sessão) ou LoginTwoFactorChallengeDto quando 2FA está ativo.',
  })
  @ApiOkResponse({
    description: 'Sessão JWT ou desafio 2FA',
    schema: {
      oneOf: [
        { $ref: '#/components/schemas/AuthResponseDto' },
        { $ref: '#/components/schemas/LoginTwoFactorChallengeDto' },
      ],
    },
  })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiOkResponse({ type: LoginTwoFactorChallengeDto })
  @ApiUnauthorizedResponse({ description: 'Credenciais inválidas' })
  login(
    @Body() dto: LoginDto,
  ): Promise<AuthResponseDto | LoginTwoFactorChallengeDto> {
    return this.authService.login(dto);
  }

  @Post('login/2fa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Concluir login com código TOTP (desafio 2FA)' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({
    description: 'preAuthToken ou código TOTP inválidos',
  })
  loginTwoFactor(@Body() dto: LoginTwoFactorDto): Promise<AuthResponseDto> {
    return this.authService.loginWithTwoFactor(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retornar o usuário autenticado' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
  me(@CurrentUser() user: UserResponseDto): Promise<UserResponseDto> {
    return this.authService.me(user.id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar perfil do usuário autenticado' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiConflictResponse({ description: 'E-mail já em uso' })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
  updateMe(
    @CurrentUser() user: UserResponseDto,
    @Body() dto: UpdateMeDto,
  ): Promise<UserResponseDto> {
    return this.authService.updateMe(user.id, dto);
  }

  @Patch('me/password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Alterar senha do usuário autenticado' })
  @ApiNoContentResponse({ description: 'Senha atualizada' })
  @ApiUnauthorizedResponse({
    description: 'Token inválido ou senha atual incorreta',
  })
  async changePassword(
    @CurrentUser() user: UserResponseDto,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    await this.authService.changePassword(user.id, dto);
  }

  @Post('me/2fa/setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar enroll de 2FA TOTP (QR + secret)' })
  @ApiOkResponse({ type: TwoFactorSetupResponseDto })
  @ApiConflictResponse({ description: '2FA já está ativo' })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
  setupTwoFactor(
    @CurrentUser() user: UserResponseDto,
  ): Promise<TwoFactorSetupResponseDto> {
    return this.authService.setupTwoFactor(user.id);
  }

  @Post('me/2fa/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar código TOTP e ativar 2FA' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiConflictResponse({ description: '2FA já está ativo' })
  @ApiUnauthorizedResponse({
    description: 'Token inválido ou código TOTP inválido',
  })
  verifyTwoFactor(
    @CurrentUser() user: UserResponseDto,
    @Body() dto: TwoFactorCodeDto,
  ): Promise<UserResponseDto> {
    return this.authService.verifyTwoFactor(user.id, dto);
  }

  @Post('me/2fa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desativar 2FA (exige senha + código TOTP)' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Token, senha ou código TOTP inválidos',
  })
  disableTwoFactor(
    @CurrentUser() user: UserResponseDto,
    @Body() dto: DisableTwoFactorDto,
  ): Promise<UserResponseDto> {
    return this.authService.disableTwoFactor(user.id, dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Encerrar sessão no cliente (no-op server-side na v1)',
  })
  @ApiNoContentResponse({ description: 'Sessão encerrada no cliente' })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
  logout(): void {
    // JWT stateless: invalidação é responsabilidade do cliente.
  }
}
