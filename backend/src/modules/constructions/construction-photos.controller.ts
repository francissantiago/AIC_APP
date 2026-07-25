import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { ActiveCongregation } from '../congregations/decorators/active-congregation.decorator';
import { CongregationContextGuard } from '../congregations/guards/congregation-context.guard';
import { ConstructionPhotosService } from './construction-photos.service';

@ApiTags('construction-photos')
@ApiBearerAuth()
@ApiErrorResponses()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
@ApiForbiddenResponse({ description: 'Perfil sem permissão' })
@UseGuards(JwtAuthGuard, PermissionsGuard, CongregationContextGuard)
@RequirePermission('constructions:read')
@Controller('construction-photos')
export class ConstructionPhotosController {
  constructor(
    private readonly constructionPhotosService: ConstructionPhotosService,
  ) {}

  @Get(':photoId/content')
  @ApiOperation({ summary: 'Obter conteúdo da foto da obra' })
  @ApiProduces('image/png', 'image/jpeg')
  @ApiOkResponse({ description: 'Stream da imagem' })
  @ApiNotFoundResponse({ description: 'Foto não encontrada' })
  async getContent(
    @Param('photoId', ParseUUIDPipe) photoId: string,
    @Res() res: Response,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<void> {
    const { stream, mimeType } =
      await this.constructionPhotosService.getContent(
        photoId,
        activeCongregationId,
      );
    res.setHeader('Content-Type', mimeType);
    stream.pipe(res);
  }

  @Delete(':photoId')
  @RequirePermission('constructions:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover foto da obra' })
  @ApiNoContentResponse({ description: 'Foto removida' })
  @ApiNotFoundResponse({ description: 'Foto não encontrada' })
  remove(
    @Param('photoId', ParseUUIDPipe) photoId: string,
    @ActiveCongregation() activeCongregationId?: string,
  ): Promise<void> {
    return this.constructionPhotosService.remove(photoId, activeCongregationId);
  }
}
