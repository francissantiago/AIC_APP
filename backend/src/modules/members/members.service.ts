import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ReadStream } from 'fs';
import * as path from 'path';
import { EntityManager, Repository } from 'typeorm';
import {
  ApiErrorCode,
  ApiErrorMessage,
} from '../../common/errors/api-error.types';
import { ApiException } from '../../common/errors/api.exception';
import { CongregationsService } from '../congregations/congregations.service';
import { FileStorageService } from '../secretariat/storage/file-storage.service';
import { UploadedFile } from '../secretariat/storage/uploaded-file.interface';
import { User } from '../users/entities/user.entity';
import { CreateMemberDto } from './dto/create-member.dto';
import {
  MemberResponseDto,
  PaginatedMembersResponseDto,
} from './dto/member-response.dto';
import { QueryMembersDto } from './dto/query-members.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { Member } from './entities/member.entity';
import { MemberGender } from './enums/member-gender.enum';
import { MemberMaritalStatus } from './enums/member-marital-status.enum';
import { MemberStatus } from './enums/member-status.enum';
import { MemberBirthdayCalendarSyncService } from './member-birthday-calendar.sync.service';

const MEMBER_PHOTOS_SUBDIR = 'members/photos';

function mimeFromPath(relativePath: string): string {
  const ext = path.extname(relativePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  return 'application/octet-stream';
}

@Injectable()
export class MembersService {
  private readonly logger = new Logger(MembersService.name);

  constructor(
    @InjectRepository(Member)
    private readonly membersRepository: Repository<Member>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly congregationsService: CongregationsService,
    private readonly birthdayCalendarSync: MemberBirthdayCalendarSyncService,
    private readonly fileStorageService: FileStorageService,
  ) {}

  private async getCongregationId(
    activeCongregationId?: string,
  ): Promise<string> {
    if (activeCongregationId) {
      return activeCongregationId;
    }
    return (await this.congregationsService.getOrCreateBase()).id;
  }

  async create(
    dto: CreateMemberDto,
    activeCongregationId?: string,
    actorUserId?: string,
  ): Promise<MemberResponseDto> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    const saved = await this.createInTransaction(
      this.membersRepository.manager,
      dto,
      congregationId,
      actorUserId,
    );
    return MemberResponseDto.fromEntity(saved);
  }

  async createInTransaction(
    manager: EntityManager,
    dto: CreateMemberDto,
    congregationId: string,
    actorUserId?: string,
  ): Promise<Member> {
    await this.assertEmailDocumentUniqueness(dto.email, dto.document);
    if (dto.userId) {
      await this.assertUserExists(dto.userId);
      await this.assertUserIdUniqueness(dto.userId);
    }

    const member = manager.create(Member, {
      fullName: dto.fullName,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      document: dto.document ?? null,
      birthDate: dto.birthDate ?? null,
      gender: dto.gender ?? MemberGender.UNSPECIFIED,
      maritalStatus: dto.maritalStatus ?? MemberMaritalStatus.OTHER,
      status: dto.status ?? MemberStatus.ACTIVE,
      baptismDate: dto.baptismDate ?? null,
      membershipDate: dto.membershipDate ?? null,
      address: dto.address ?? null,
      city: dto.city ?? null,
      state: dto.state ?? null,
      zipCode: dto.zipCode ?? null,
      notes: dto.notes ?? null,
      rg: dto.rg ?? null,
      placeOfBirth: dto.placeOfBirth ?? null,
      bloodType: dto.bloodType ?? null,
      fatherName: dto.fatherName ?? null,
      motherName: dto.motherName ?? null,
      positionTitle: dto.positionTitle ?? null,
      photoPath: null,
      congregationId,
      userId: dto.userId ?? null,
    });

    const saved = await manager.save(member);
    this.logger.log(`Membro criado: ${saved.id} (${saved.fullName})`);
    if (actorUserId) {
      await this.birthdayCalendarSync.syncOnCreate(
        saved,
        { actorUserId, congregationId },
        manager,
      );
    }
    return saved;
  }

  async findAll(
    query: QueryMembersDto,
    activeCongregationId?: string,
  ): Promise<PaginatedMembersResponseDto> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    const { page, limit, status, gender, q } = query;

    const qb = this.membersRepository
      .createQueryBuilder('member')
      .where('member.congregationId = :congregationId', {
        congregationId,
      })
      .orderBy('member.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      qb.andWhere('member.status = :status', { status });
    }
    if (gender) {
      qb.andWhere('member.gender = :gender', { gender });
    }
    if (q) {
      qb.andWhere(
        '(member.fullName LIKE :q OR member.email LIKE :q OR member.document LIKE :q OR member.phone LIKE :q)',
        { q: `%${q}%` },
      );
    }

    const [members, total] = await qb.getManyAndCount();
    return {
      data: members.map((member) => MemberResponseDto.fromEntity(member)),
      total,
      page,
      limit,
    };
  }

  async findOne(
    id: string,
    activeCongregationId?: string,
  ): Promise<MemberResponseDto> {
    const member = await this.getMemberOrFail(id, activeCongregationId);
    return MemberResponseDto.fromEntity(member);
  }

  async update(
    id: string,
    dto: UpdateMemberDto,
    activeCongregationId?: string,
    actorUserId?: string,
  ): Promise<MemberResponseDto> {
    const member = await this.getMemberOrFail(id, activeCongregationId);
    const before = Object.assign(new Member(), member);

    if (dto.email !== undefined && dto.email !== member.email) {
      await this.assertEmailDocumentUniqueness(dto.email, undefined, id);
      member.email = dto.email ?? null;
    }
    if (dto.document !== undefined && dto.document !== member.document) {
      await this.assertEmailDocumentUniqueness(undefined, dto.document, id);
      member.document = dto.document ?? null;
    }
    if (dto.userId !== undefined && dto.userId !== member.userId) {
      if (dto.userId) {
        await this.assertUserExists(dto.userId);
        await this.assertUserIdUniqueness(dto.userId, id);
      }
      member.userId = dto.userId ?? null;
    }

    if (dto.fullName !== undefined) {
      member.fullName = dto.fullName;
    }
    if (dto.phone !== undefined) {
      member.phone = dto.phone ?? null;
    }
    if (dto.birthDate !== undefined) {
      member.birthDate = dto.birthDate ?? null;
    }
    if (dto.gender !== undefined) {
      member.gender = dto.gender;
    }
    if (dto.maritalStatus !== undefined) {
      member.maritalStatus = dto.maritalStatus;
    }
    if (dto.status !== undefined) {
      member.status = dto.status;
    }
    if (dto.baptismDate !== undefined) {
      member.baptismDate = dto.baptismDate ?? null;
    }
    if (dto.membershipDate !== undefined) {
      member.membershipDate = dto.membershipDate ?? null;
    }
    if (dto.address !== undefined) {
      member.address = dto.address ?? null;
    }
    if (dto.city !== undefined) {
      member.city = dto.city ?? null;
    }
    if (dto.state !== undefined) {
      member.state = dto.state ?? null;
    }
    if (dto.zipCode !== undefined) {
      member.zipCode = dto.zipCode ?? null;
    }
    if (dto.notes !== undefined) {
      member.notes = dto.notes ?? null;
    }
    if (dto.rg !== undefined) {
      member.rg = dto.rg ?? null;
    }
    if (dto.placeOfBirth !== undefined) {
      member.placeOfBirth = dto.placeOfBirth ?? null;
    }
    if (dto.bloodType !== undefined) {
      member.bloodType = dto.bloodType ?? null;
    }
    if (dto.fatherName !== undefined) {
      member.fatherName = dto.fatherName ?? null;
    }
    if (dto.motherName !== undefined) {
      member.motherName = dto.motherName ?? null;
    }
    if (dto.positionTitle !== undefined) {
      member.positionTitle = dto.positionTitle ?? null;
    }

    const saved = await this.membersRepository.save(member);
    this.logger.log(`Membro atualizado: ${saved.id}`);
    if (actorUserId) {
      await this.birthdayCalendarSync.syncOnUpdate(before, saved, {
        actorUserId,
        congregationId: saved.congregationId,
      });
    }
    return MemberResponseDto.fromEntity(saved);
  }

  async remove(
    id: string,
    activeCongregationId?: string,
    actorUserId?: string,
  ): Promise<void> {
    const member = await this.getMemberOrFail(id, activeCongregationId);
    if (actorUserId) {
      await this.birthdayCalendarSync.syncOnRemove(member);
    }
    const photoPath = member.photoPath;
    await this.membersRepository.softRemove(member);
    await this.fileStorageService.deleteIfExists(photoPath);
    this.logger.log(`Membro removido (soft delete): ${id}`);
  }

  async uploadPhoto(
    id: string,
    file: UploadedFile | undefined,
    activeCongregationId?: string,
  ): Promise<MemberResponseDto> {
    const member = await this.getMemberOrFail(id, activeCongregationId);
    const previousPath = member.photoPath;
    const savedFile = await this.fileStorageService.saveImageAsset(
      MEMBER_PHOTOS_SUBDIR,
      member.id,
      file as UploadedFile,
    );
    member.photoPath = savedFile.relativePath;
    const saved = await this.membersRepository.save(member);
    if (previousPath && previousPath !== saved.photoPath) {
      await this.fileStorageService.deleteIfExists(previousPath);
    }
    this.logger.log(`Foto do membro atualizada: ${saved.id}`);
    return MemberResponseDto.fromEntity(saved);
  }

  async getPhotoStream(
    id: string,
    activeCongregationId?: string,
  ): Promise<{ stream: ReadStream; mimeType: string; absolutePath: string }> {
    const member = await this.getMemberOrFail(id, activeCongregationId);
    if (!member.photoPath) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.SECRETARIAT_DOCUMENT_FILE_NOT_FOUND,
        message:
          ApiErrorMessage[ApiErrorCode.SECRETARIAT_DOCUMENT_FILE_NOT_FOUND],
      });
    }
    const opened = await this.fileStorageService.openReadStream(
      member.photoPath,
    );
    return {
      stream: opened.stream,
      absolutePath: opened.absolutePath,
      mimeType: mimeFromPath(member.photoPath),
    };
  }

  async removePhoto(id: string, activeCongregationId?: string): Promise<void> {
    const member = await this.getMemberOrFail(id, activeCongregationId);
    if (!member.photoPath) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.SECRETARIAT_DOCUMENT_FILE_NOT_FOUND,
        message:
          ApiErrorMessage[ApiErrorCode.SECRETARIAT_DOCUMENT_FILE_NOT_FOUND],
      });
    }
    const photoPath = member.photoPath;
    member.photoPath = null;
    await this.membersRepository.save(member);
    await this.fileStorageService.deleteIfExists(photoPath);
    this.logger.log(`Foto do membro removida: ${id}`);
  }

  /** Exposto para módulos que precisam da entity (ex.: membership-cards). */
  async getMemberEntityOrFail(
    id: string,
    activeCongregationId?: string,
  ): Promise<Member> {
    return this.getMemberOrFail(id, activeCongregationId);
  }

  private async getMemberOrFail(
    id: string,
    activeCongregationId?: string,
  ): Promise<Member> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    const member = await this.membersRepository.findOne({
      where: { id, congregationId },
    });
    if (!member) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.MEMBERS_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.MEMBERS_NOT_FOUND],
      });
    }
    return member;
  }

  private async assertEmailDocumentUniqueness(
    email?: string,
    document?: string,
    excludeId?: string,
  ): Promise<void> {
    if (email) {
      const conflict = await this.membersRepository.findOne({
        where: { email },
        withDeleted: true,
      });
      if (conflict && conflict.id !== excludeId) {
        throw new ApiException(HttpStatus.CONFLICT, {
          code: ApiErrorCode.MEMBERS_EMAIL_IN_USE,
          message: ApiErrorMessage[ApiErrorCode.MEMBERS_EMAIL_IN_USE],
          details: [
            {
              field: 'email',
              code: ApiErrorCode.MEMBERS_EMAIL_IN_USE,
              message: ApiErrorMessage[ApiErrorCode.MEMBERS_EMAIL_IN_USE],
            },
          ],
        });
      }
    }
    if (document) {
      const conflict = await this.membersRepository.findOne({
        where: { document },
        withDeleted: true,
      });
      if (conflict && conflict.id !== excludeId) {
        throw new ApiException(HttpStatus.CONFLICT, {
          code: ApiErrorCode.MEMBERS_DOCUMENT_IN_USE,
          message: ApiErrorMessage[ApiErrorCode.MEMBERS_DOCUMENT_IN_USE],
          details: [
            {
              field: 'document',
              code: ApiErrorCode.MEMBERS_DOCUMENT_IN_USE,
              message: ApiErrorMessage[ApiErrorCode.MEMBERS_DOCUMENT_IN_USE],
            },
          ],
        });
      }
    }
  }

  private async assertUserIdUniqueness(
    userId: string,
    excludeId?: string,
  ): Promise<void> {
    const conflict = await this.membersRepository.findOne({
      where: { userId },
      withDeleted: true,
    });
    if (conflict && conflict.id !== excludeId) {
      throw new ApiException(HttpStatus.CONFLICT, {
        code: ApiErrorCode.MEMBERS_USER_ALREADY_LINKED,
        message: ApiErrorMessage[ApiErrorCode.MEMBERS_USER_ALREADY_LINKED],
        details: [
          {
            field: 'userId',
            code: ApiErrorCode.MEMBERS_USER_ALREADY_LINKED,
            message: ApiErrorMessage[ApiErrorCode.MEMBERS_USER_ALREADY_LINKED],
          },
        ],
      });
    }
  }

  private async assertUserExists(userId: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.MEMBERS_USER_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.MEMBERS_USER_NOT_FOUND],
        details: [
          {
            field: 'userId',
            code: ApiErrorCode.MEMBERS_USER_NOT_FOUND,
            message: ApiErrorMessage[ApiErrorCode.MEMBERS_USER_NOT_FOUND],
          },
        ],
      });
    }
  }
}
