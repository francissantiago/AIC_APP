import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import {
  ApiErrorCode,
  ApiErrorMessage,
} from '../../common/errors/api-error.types';
import { ApiException } from '../../common/errors/api.exception';
import { Member } from '../members/entities/member.entity';

export interface MemberUserLinkSummary {
  memberId: string;
  memberFullName: string;
}

@Injectable()
export class MemberUserLinkService {
  private readonly logger = new Logger(MemberUserLinkService.name);

  constructor(
    @InjectRepository(Member)
    private readonly membersRepository: Repository<Member>,
  ) {}

  async findMemberLinkByUserId(
    userId: string,
  ): Promise<MemberUserLinkSummary | null> {
    const member = await this.membersRepository.findOne({
      where: { userId },
      select: { id: true, fullName: true },
    });
    if (!member) {
      return null;
    }
    return { memberId: member.id, memberFullName: member.fullName };
  }

  async findMemberLinksByUserIds(
    userIds: string[],
  ): Promise<Map<string, MemberUserLinkSummary>> {
    const result = new Map<string, MemberUserLinkSummary>();
    if (userIds.length === 0) {
      return result;
    }
    const members = await this.membersRepository.find({
      where: { userId: In(userIds) },
      select: { id: true, fullName: true, userId: true },
    });
    for (const member of members) {
      if (member.userId) {
        result.set(member.userId, {
          memberId: member.id,
          memberFullName: member.fullName,
        });
      }
    }
    return result;
  }

  async linkUserToMember(
    userId: string,
    memberId: string,
    congregationId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = manager
      ? manager.getRepository(Member)
      : this.membersRepository;

    const member = await repo.findOne({
      where: { id: memberId, congregationId },
    });
    if (!member) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.USERS_MEMBER_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.USERS_MEMBER_NOT_FOUND],
        details: [
          {
            field: 'memberId',
            code: ApiErrorCode.USERS_MEMBER_NOT_FOUND,
            message: ApiErrorMessage[ApiErrorCode.USERS_MEMBER_NOT_FOUND],
          },
        ],
      });
    }

    if (member.userId && member.userId !== userId) {
      throw new ApiException(HttpStatus.CONFLICT, {
        code: ApiErrorCode.USERS_MEMBER_ALREADY_LINKED,
        message: ApiErrorMessage[ApiErrorCode.USERS_MEMBER_ALREADY_LINKED],
        details: [
          {
            field: 'memberId',
            code: ApiErrorCode.USERS_MEMBER_ALREADY_LINKED,
            message: ApiErrorMessage[ApiErrorCode.USERS_MEMBER_ALREADY_LINKED],
          },
        ],
      });
    }

    await this.assertUserIdUniqueness(userId, memberId, repo);

    member.userId = userId;
    await repo.save(member);
    this.logger.log(`Usuário ${userId} vinculado ao membro ${memberId}`);
  }

  async unlinkUserFromMember(
    userId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = manager
      ? manager.getRepository(Member)
      : this.membersRepository;
    const member = await repo.findOne({ where: { userId } });
    if (!member) {
      return;
    }
    member.userId = null;
    await repo.save(member);
    this.logger.log(`Usuário ${userId} desvinculado do membro ${member.id}`);
  }

  private async assertUserIdUniqueness(
    userId: string,
    excludeMemberId: string,
    repo: Repository<Member> = this.membersRepository,
  ): Promise<void> {
    const conflict = await repo.findOne({
      where: { userId },
      withDeleted: true,
    });
    if (conflict && conflict.id !== excludeMemberId) {
      throw new ApiException(HttpStatus.CONFLICT, {
        code: ApiErrorCode.MEMBERS_USER_ALREADY_LINKED,
        message: ApiErrorMessage[ApiErrorCode.MEMBERS_USER_ALREADY_LINKED],
        details: [
          {
            field: 'memberId',
            code: ApiErrorCode.MEMBERS_USER_ALREADY_LINKED,
            message: ApiErrorMessage[ApiErrorCode.MEMBERS_USER_ALREADY_LINKED],
          },
        ],
      });
    }
  }
}
