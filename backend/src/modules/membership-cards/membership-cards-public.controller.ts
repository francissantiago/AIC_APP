import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle, seconds } from '@nestjs/throttler';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { MembershipCardVerifyResponseDto } from './dto/membership-card-verify-response.dto';
import { MembershipCardsService } from './membership-cards.service';

/**
 * Endpoints públicos de carteirinha (sem JWT) — usados pelo QR Code.
 */
@ApiTags('membership-cards-public')
@ApiErrorResponses()
@Controller('membership-cards/public')
export class MembershipCardsPublicController {
  constructor(
    private readonly membershipCardsService: MembershipCardsService,
  ) {}

  @Get('verify/:memberId')
  @Throttle({ default: { limit: 30, ttl: seconds(60) } })
  @ApiOperation({
    summary: 'Validar carteirinha de membro via QR Code (público)',
  })
  @ApiOkResponse({ type: MembershipCardVerifyResponseDto })
  @ApiNotFoundResponse({ description: 'Membro não encontrado (valid=false)' })
  @ApiTooManyRequestsResponse({ description: 'Limite de requisições excedido' })
  verify(
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ): Promise<MembershipCardVerifyResponseDto> {
    return this.membershipCardsService.verifyPublic(memberId);
  }
}
