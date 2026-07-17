import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateMemberDto } from './dto/create-member.dto';
import {
  MemberResponseDto,
  PaginatedMembersResponseDto,
} from './dto/member-response.dto';
import { QueryMembersDto } from './dto/query-members.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { MembersService } from './members.service';

@ApiTags('members')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
@UseGuards(JwtAuthGuard)
@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Post()
  @ApiOperation({ summary: 'Criar membro' })
  @ApiCreatedResponse({ type: MemberResponseDto })
  @ApiConflictResponse({ description: 'email ou document já em uso' })
  @ApiUnprocessableEntityResponse({
    description: 'userId aponta para usuário inexistente',
  })
  create(@Body() dto: CreateMemberDto): Promise<MemberResponseDto> {
    return this.membersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar membros (paginado, com filtros)' })
  @ApiOkResponse({ type: PaginatedMembersResponseDto })
  findAll(
    @Query() query: QueryMembersDto,
  ): Promise<PaginatedMembersResponseDto> {
    return this.membersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar membro' })
  @ApiOkResponse({ type: MemberResponseDto })
  @ApiNotFoundResponse({ description: 'Membro não encontrado' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<MemberResponseDto> {
    return this.membersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar membro (parcial)' })
  @ApiOkResponse({ type: MemberResponseDto })
  @ApiNotFoundResponse({ description: 'Membro não encontrado' })
  @ApiConflictResponse({ description: 'email ou document já em uso' })
  @ApiUnprocessableEntityResponse({
    description: 'userId aponta para usuário inexistente',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMemberDto,
  ): Promise<MemberResponseDto> {
    return this.membersService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover membro (soft delete via deleted_at)' })
  @ApiNoContentResponse({ description: 'Membro removido' })
  @ApiNotFoundResponse({ description: 'Membro não encontrado' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.membersService.remove(id);
  }
}
