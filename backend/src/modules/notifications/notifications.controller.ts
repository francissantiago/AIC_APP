import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { PaginatedNotificationsResponseDto } from './dto/paginated-notifications-response.dto';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import {
  MarkAllReadResponseDto,
  UnreadCountResponseDto,
} from './dto/unread-count-response.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@ApiErrorResponses()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
@ApiForbiddenResponse({ description: 'Perfil sem permissão' })
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar notificações do usuário autenticado' })
  @ApiOkResponse({ type: PaginatedNotificationsResponseDto })
  findAll(
    @Query() query: QueryNotificationsDto,
    @CurrentUser() user: UserResponseDto,
  ): Promise<PaginatedNotificationsResponseDto> {
    return this.notificationsService.findAllForUser(user.id, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Contar notificações não lidas do usuário' })
  @ApiOkResponse({ type: UnreadCountResponseDto })
  getUnreadCount(
    @CurrentUser() user: UserResponseDto,
  ): Promise<UnreadCountResponseDto> {
    return this.notificationsService.getUnreadCount(user.id);
  }

  @Patch('read-all')
  @ApiOperation({
    summary: 'Marcar todas as notificações não lidas como lidas',
  })
  @ApiOkResponse({ type: MarkAllReadResponseDto })
  markAllAsRead(
    @CurrentUser() user: UserResponseDto,
  ): Promise<MarkAllReadResponseDto> {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marcar notificação como lida' })
  @ApiOkResponse({ type: NotificationResponseDto })
  @ApiNotFoundResponse({ description: 'Notificação não encontrada' })
  markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserResponseDto,
  ): Promise<NotificationResponseDto> {
    return this.notificationsService.markAsRead(id, user.id);
  }
}
