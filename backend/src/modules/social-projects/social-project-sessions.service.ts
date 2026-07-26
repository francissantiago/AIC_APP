import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  ApiErrorCode,
  ApiErrorMessage,
} from '../../common/errors/api-error.types';
import { ApiException } from '../../common/errors/api.exception';
import { CreateSocialProjectSessionDto } from './dto/create-social-project-session.dto';
import { QuerySocialProjectSessionsDto } from './dto/query-social-project-sessions.dto';
import { SocialProjectAttendanceResponseDto } from './dto/social-project-attendance-response.dto';
import {
  PaginatedSocialProjectSessionsResponseDto,
  SocialProjectSessionResponseDto,
} from './dto/social-project-session-response.dto';
import { UpdateSocialProjectSessionDto } from './dto/update-social-project-session.dto';
import {
  UpsertSocialProjectAttendanceDto,
  UpsertSocialProjectAttendanceEntryDto,
} from './dto/upsert-social-project-attendance.dto';
import { SocialProjectAttendance } from './entities/social-project-attendance.entity';
import { SocialProjectMember } from './entities/social-project-member.entity';
import { SocialProjectSession } from './entities/social-project-session.entity';
import { SocialProjectNotificationsService } from './social-project-notifications.service';
import { SocialProjectsService } from './social-projects.service';

@Injectable()
export class SocialProjectSessionsService {
  private readonly logger = new Logger(SocialProjectSessionsService.name);

  constructor(
    @InjectRepository(SocialProjectSession)
    private readonly sessionsRepository: Repository<SocialProjectSession>,
    @InjectRepository(SocialProjectMember)
    private readonly membersRepository: Repository<SocialProjectMember>,
    @InjectRepository(SocialProjectAttendance)
    private readonly attendanceRepository: Repository<SocialProjectAttendance>,
    private readonly socialProjectsService: SocialProjectsService,
    private readonly socialProjectNotificationsService: SocialProjectNotificationsService,
  ) {}

  async findAllGlobal(
    query: QuerySocialProjectSessionsDto,
    activeCongregationId?: string,
  ): Promise<PaginatedSocialProjectSessionsResponseDto> {
    const congregationId =
      await this.socialProjectsService.getCongregationId(activeCongregationId);
    const { page, limit, socialProjectId, dateFrom, dateTo, q } = query;

    const qb = this.sessionsRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.socialProject', 'project')
      .where('session.congregationId = :congregationId', { congregationId })
      .orderBy('session.sessionDate', 'DESC')
      .addOrderBy('session.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (socialProjectId) {
      qb.andWhere('session.socialProjectId = :socialProjectId', {
        socialProjectId,
      });
    }
    if (dateFrom) {
      qb.andWhere('session.sessionDate >= :dateFrom', { dateFrom });
    }
    if (dateTo) {
      qb.andWhere('session.sessionDate <= :dateTo', { dateTo });
    }
    if (q) {
      qb.andWhere('(session.title LIKE :q OR session.theme LIKE :q)', {
        q: `%${q}%`,
      });
    }

    const [sessions, total] = await qb.getManyAndCount();
    return {
      data: sessions.map((session) =>
        SocialProjectSessionResponseDto.fromEntity(session, {
          socialProjectName: session.socialProject?.name ?? null,
        }),
      ),
      total,
      page,
      limit,
    };
  }

  async findByProject(
    projectId: string,
    query: QuerySocialProjectSessionsDto,
    activeCongregationId?: string,
  ): Promise<PaginatedSocialProjectSessionsResponseDto> {
    await this.socialProjectsService.getProjectOrFailInternal(
      projectId,
      await this.socialProjectsService.getCongregationId(activeCongregationId),
    );

    const { page, limit, dateFrom, dateTo } = query;
    const qb = this.sessionsRepository
      .createQueryBuilder('session')
      .where('session.socialProjectId = :projectId', { projectId })
      .orderBy('session.sessionDate', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (dateFrom) {
      qb.andWhere('session.sessionDate >= :dateFrom', { dateFrom });
    }
    if (dateTo) {
      qb.andWhere('session.sessionDate <= :dateTo', { dateTo });
    }

    const [sessions, total] = await qb.getManyAndCount();
    return {
      data: sessions.map((session) =>
        SocialProjectSessionResponseDto.fromEntity(session),
      ),
      total,
      page,
      limit,
    };
  }

  async create(
    projectId: string,
    dto: CreateSocialProjectSessionDto,
    actorUserId?: string,
    activeCongregationId?: string,
  ): Promise<SocialProjectSessionResponseDto> {
    const congregationId =
      await this.socialProjectsService.getCongregationId(activeCongregationId);
    const project = await this.socialProjectsService.getProjectOrFailInternal(
      projectId,
      congregationId,
    );

    await this.assertSessionDateAvailable(projectId, dto.sessionDate);

    const session = this.sessionsRepository.create({
      congregationId,
      socialProjectId: projectId,
      sessionDate: dto.sessionDate,
      title: dto.title.trim(),
      theme: this.nullableText(dto.theme),
      notes: this.nullableText(dto.notes),
      location: this.nullableText(dto.location),
    });
    const saved = await this.sessionsRepository.save(session);

    await this.socialProjectNotificationsService.notifySessionCreated(
      saved,
      project,
      actorUserId,
    );

    this.logger.log(
      `Sessão criada: ${saved.id} (projeto ${projectId}, ${dto.sessionDate})`,
    );
    return SocialProjectSessionResponseDto.fromEntity(saved, {
      socialProjectName: project.name,
    });
  }

  async update(
    projectId: string,
    sessionId: string,
    dto: UpdateSocialProjectSessionDto,
    activeCongregationId?: string,
  ): Promise<SocialProjectSessionResponseDto> {
    const congregationId =
      await this.socialProjectsService.getCongregationId(activeCongregationId);
    await this.socialProjectsService.getProjectOrFailInternal(
      projectId,
      congregationId,
    );
    const session = await this.getSessionOrFail(projectId, sessionId);

    if (
      dto.sessionDate !== undefined &&
      dto.sessionDate !== session.sessionDate
    ) {
      await this.assertSessionDateAvailable(
        projectId,
        dto.sessionDate,
        sessionId,
      );
      session.sessionDate = dto.sessionDate;
    }
    if (dto.title !== undefined) {
      session.title = dto.title.trim();
    }
    if (dto.theme !== undefined) {
      session.theme = this.nullableText(dto.theme);
    }
    if (dto.notes !== undefined) {
      session.notes = this.nullableText(dto.notes);
    }
    if (dto.location !== undefined) {
      session.location = this.nullableText(dto.location);
    }

    const saved = await this.sessionsRepository.save(session);
    return SocialProjectSessionResponseDto.fromEntity(saved);
  }

  async remove(
    projectId: string,
    sessionId: string,
    activeCongregationId?: string,
  ): Promise<void> {
    const congregationId =
      await this.socialProjectsService.getCongregationId(activeCongregationId);
    await this.socialProjectsService.getProjectOrFailInternal(
      projectId,
      congregationId,
    );
    const session = await this.getSessionOrFail(projectId, sessionId);
    await this.sessionsRepository.softRemove(session);
    this.logger.log(`Sessão removida: ${sessionId} (projeto ${projectId})`);
  }

  async getAttendance(
    projectId: string,
    sessionId: string,
    activeCongregationId?: string,
  ): Promise<SocialProjectAttendanceResponseDto> {
    const congregationId =
      await this.socialProjectsService.getCongregationId(activeCongregationId);
    const project = await this.socialProjectsService.getProjectOrFailInternal(
      projectId,
      congregationId,
    );
    const session = await this.getSessionOrFail(projectId, sessionId);

    const links = await this.membersRepository
      .createQueryBuilder('link')
      .leftJoinAndSelect('link.member', 'member')
      .where('link.socialProjectId = :projectId', { projectId })
      .orderBy('member.fullName', 'ASC')
      .getMany();

    const attendanceRows = await this.attendanceRepository.find({
      where: { sessionId },
    });
    const attendanceByMember = new Map(
      attendanceRows.map((row) => [row.memberId, row]),
    );

    return {
      socialProjectId: project.id,
      socialProjectName: project.name,
      sessionId: session.id,
      sessionDate: session.sessionDate,
      sessionTitle: session.title,
      entries: links.map((link) => {
        const attendance = attendanceByMember.get(link.memberId);
        return {
          memberId: link.memberId,
          memberFullName: link.member?.fullName ?? '',
          attendanceId: attendance?.id ?? null,
          present: attendance ? attendance.present : null,
          notes: attendance?.notes ?? null,
        };
      }),
    };
  }

  async upsertAttendance(
    projectId: string,
    sessionId: string,
    dto: UpsertSocialProjectAttendanceDto,
    activeCongregationId?: string,
  ): Promise<SocialProjectAttendanceResponseDto> {
    const congregationId =
      await this.socialProjectsService.getCongregationId(activeCongregationId);
    await this.socialProjectsService.getProjectOrFailInternal(
      projectId,
      congregationId,
    );
    await this.getSessionOrFail(projectId, sessionId);

    const memberIds = [...new Set(dto.entries.map((entry) => entry.memberId))];
    const links = await this.membersRepository.find({
      where: {
        socialProjectId: projectId,
        memberId: In(memberIds),
      },
    });
    const participantIds = new Set(links.map((link) => link.memberId));
    const notParticipant = memberIds.find((id) => !participantIds.has(id));
    if (notParticipant) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.SOCIAL_PROJECTS_ATTENDANCE_MEMBER_NOT_PARTICIPANT,
        message:
          ApiErrorMessage[
            ApiErrorCode.SOCIAL_PROJECTS_ATTENDANCE_MEMBER_NOT_PARTICIPANT
          ],
        details: [
          {
            field: 'entries',
            code: ApiErrorCode.SOCIAL_PROJECTS_ATTENDANCE_MEMBER_NOT_PARTICIPANT,
            message:
              ApiErrorMessage[
                ApiErrorCode.SOCIAL_PROJECTS_ATTENDANCE_MEMBER_NOT_PARTICIPANT
              ],
          },
        ],
      });
    }

    for (const entry of dto.entries) {
      await this.upsertAttendanceEntry(sessionId, entry);
    }

    this.logger.log(
      `Chamada salva: projeto ${projectId}, sessão ${sessionId}, ${dto.entries.length} entradas`,
    );

    return this.getAttendance(projectId, sessionId, activeCongregationId);
  }

  private async getSessionOrFail(
    projectId: string,
    sessionId: string,
  ): Promise<SocialProjectSession> {
    const session = await this.sessionsRepository.findOne({
      where: { id: sessionId, socialProjectId: projectId },
    });
    if (!session) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.SOCIAL_PROJECTS_SESSION_NOT_FOUND,
        message:
          ApiErrorMessage[ApiErrorCode.SOCIAL_PROJECTS_SESSION_NOT_FOUND],
      });
    }
    return session;
  }

  private async assertSessionDateAvailable(
    projectId: string,
    sessionDate: string,
    excludeSessionId?: string,
  ): Promise<void> {
    const conflict = await this.sessionsRepository.findOne({
      where: { socialProjectId: projectId, sessionDate },
      withDeleted: true,
    });
    if (conflict && conflict.id !== excludeSessionId) {
      throw new ApiException(HttpStatus.CONFLICT, {
        code: ApiErrorCode.SOCIAL_PROJECTS_SESSION_DATE_CONFLICT,
        message:
          ApiErrorMessage[ApiErrorCode.SOCIAL_PROJECTS_SESSION_DATE_CONFLICT],
      });
    }
  }

  private async upsertAttendanceEntry(
    sessionId: string,
    entry: UpsertSocialProjectAttendanceEntryDto,
  ): Promise<void> {
    const existing = await this.attendanceRepository.findOne({
      where: { sessionId, memberId: entry.memberId },
    });
    if (existing) {
      existing.present = entry.present;
      if (entry.notes !== undefined) {
        existing.notes = this.nullableText(entry.notes);
      }
      await this.attendanceRepository.save(existing);
      return;
    }
    const row = this.attendanceRepository.create({
      sessionId,
      memberId: entry.memberId,
      present: entry.present,
      notes: this.nullableText(entry.notes),
    });
    await this.attendanceRepository.save(row);
  }

  private nullableText(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }
}
