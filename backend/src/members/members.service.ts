import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

@Injectable()
export class MembersService {
  private readonly logger = new Logger(MembersService.name);

  constructor(
    @InjectRepository(Member)
    private readonly membersRepository: Repository<Member>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(dto: CreateMemberDto): Promise<MemberResponseDto> {
    await this.assertEmailDocumentUniqueness(dto.email, dto.document);
    if (dto.userId) {
      await this.assertUserExists(dto.userId);
      await this.assertUserIdUniqueness(dto.userId);
    }

    const member = this.membersRepository.create({
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
      userId: dto.userId ?? null,
    });

    const saved = await this.membersRepository.save(member);
    this.logger.log(`Membro criado: ${saved.id} (${saved.fullName})`);
    return MemberResponseDto.fromEntity(saved);
  }

  async findAll(query: QueryMembersDto): Promise<PaginatedMembersResponseDto> {
    const { page, limit, status, gender, q } = query;

    const qb = this.membersRepository
      .createQueryBuilder('member')
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

  async findOne(id: string): Promise<MemberResponseDto> {
    const member = await this.getMemberOrFail(id);
    return MemberResponseDto.fromEntity(member);
  }

  async update(id: string, dto: UpdateMemberDto): Promise<MemberResponseDto> {
    const member = await this.getMemberOrFail(id);

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

    const saved = await this.membersRepository.save(member);
    this.logger.log(`Membro atualizado: ${saved.id}`);
    return MemberResponseDto.fromEntity(saved);
  }

  async remove(id: string): Promise<void> {
    const member = await this.getMemberOrFail(id);
    await this.membersRepository.softRemove(member);
    this.logger.log(`Membro removido (soft delete): ${id}`);
  }

  private async getMemberOrFail(id: string): Promise<Member> {
    const member = await this.membersRepository.findOne({ where: { id } });
    if (!member) {
      throw new NotFoundException(`Membro ${id} não encontrado`);
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
        throw new ConflictException('email já está em uso');
      }
    }
    if (document) {
      const conflict = await this.membersRepository.findOne({
        where: { document },
        withDeleted: true,
      });
      if (conflict && conflict.id !== excludeId) {
        throw new ConflictException('document já está em uso');
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
      throw new ConflictException('userId já está vinculado a outro membro');
    }
  }

  private async assertUserExists(userId: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnprocessableEntityException(
        `Usuário ${userId} não encontrado`,
      );
    }
  }
}
