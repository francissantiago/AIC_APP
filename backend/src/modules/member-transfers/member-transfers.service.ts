import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  ApiErrorCode,
  ApiErrorMessage,
} from '../../common/errors/api-error.types';
import { ApiException } from '../../common/errors/api.exception';
import { CongregationsService } from '../congregations/congregations.service';
import { Member } from '../members/entities/member.entity';
import { MemberStatus } from '../members/enums/member-status.enum';
import { SecretariatDocument } from '../secretariat/documents/entities/secretariat-document.entity';
import { DocumentsService } from '../secretariat/documents/documents.service';
import {
  SecretariatDocumentStatus,
  SecretariatDocumentType,
} from '../secretariat/enums/secretariat.enums';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { CreateMemberTransferDto } from './dto/create-member-transfer.dto';
import { MemberTransferResponseDto } from './dto/member-transfer-response.dto';
import { MemberTransfer } from './entities/member-transfer.entity';
import { MemberTransferStatus } from './enums/member-transfer-status.enum';

@Injectable()
export class MemberTransfersService {
  private readonly logger = new Logger(MemberTransfersService.name);

  constructor(
    @InjectRepository(MemberTransfer)
    private readonly transfersRepository: Repository<MemberTransfer>,
    @InjectRepository(Member)
    private readonly membersRepository: Repository<Member>,
    private readonly congregationsService: CongregationsService,
    private readonly documentsService: DocumentsService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async listByMember(memberId: string): Promise<MemberTransferResponseDto[]> {
    const congregationId = await this.getCongregationId();
    await this.getMemberOrFail(memberId, congregationId);

    const transfers = await this.transfersRepository.find({
      where: { memberId, congregationId },
      relations: { document: true, member: true },
      order: { requestedAt: 'DESC' },
    });

    return transfers.map((transfer) =>
      MemberTransferResponseDto.fromEntity(transfer),
    );
  }

  async findOne(
    memberId: string,
    id: string,
  ): Promise<MemberTransferResponseDto> {
    const congregationId = await this.getCongregationId();
    await this.getMemberOrFail(memberId, congregationId);
    const transfer = await this.getTransferOrFail(id, memberId, congregationId);
    return MemberTransferResponseDto.fromEntity(transfer);
  }

  async create(
    memberId: string,
    dto: CreateMemberTransferDto,
    user: UserResponseDto,
  ): Promise<MemberTransferResponseDto> {
    const congregationId = await this.getCongregationId();
    const member = await this.getMemberOrFail(memberId, congregationId);
    this.assertMemberEligible(member);

    const pendingExists = await this.transfersRepository.exists({
      where: {
        memberId,
        congregationId,
        status: MemberTransferStatus.PENDING,
      },
    });
    if (pendingExists) {
      throw new ApiException(HttpStatus.CONFLICT, {
        code: ApiErrorCode.MEMBERS_TRANSFER_PENDING_EXISTS,
        message: ApiErrorMessage[ApiErrorCode.MEMBERS_TRANSFER_PENDING_EXISTS],
      });
    }

    const requestedAt = new Date();
    const documentDate = this.toLocalDateString(requestedAt);
    const letterTitle = this.buildLetterTitle(member.fullName);
    const summary = this.buildLetterSummary({
      memberName: member.fullName,
      destinationChurchName: dto.destinationChurchName,
      destinationCity: dto.destinationCity,
      notes: dto.notes ?? null,
    });

    const document = await this.documentsService.createDocument(
      {
        title: letterTitle,
        type: SecretariatDocumentType.LETTER,
        documentDate,
        summary,
        status: SecretariatDocumentStatus.DRAFT,
      },
      user,
    );

    const completeNow = dto.completeNow === true;

    const transferId = await this.dataSource.transaction(async (manager) => {
      const transfer = manager.create(MemberTransfer, {
        congregationId,
        memberId,
        destinationChurchName: dto.destinationChurchName,
        destinationCity: dto.destinationCity,
        requestedAt,
        approvedAt: null,
        status: MemberTransferStatus.PENDING,
        documentId: document.id,
        notes: dto.notes ?? null,
        requestedByUserId: user.id,
      });
      const saved = await manager.save(transfer);

      if (completeNow) {
        await this.applyCompleteInTransaction(manager, saved, member);
      }

      return saved.id;
    });

    this.logger.log(
      `Transferência criada: ${transferId} (membro ${memberId}${completeNow ? ', completed' : ''})`,
    );

    return this.findOne(memberId, transferId);
  }

  async complete(
    memberId: string,
    id: string,
  ): Promise<MemberTransferResponseDto> {
    const congregationId = await this.getCongregationId();
    const member = await this.getMemberOrFail(memberId, congregationId);
    const transfer = await this.getTransferOrFail(id, memberId, congregationId);

    if (transfer.status !== MemberTransferStatus.PENDING) {
      throw new ApiException(HttpStatus.CONFLICT, {
        code: ApiErrorCode.MEMBERS_TRANSFER_INVALID_STATUS,
        message: ApiErrorMessage[ApiErrorCode.MEMBERS_TRANSFER_INVALID_STATUS],
      });
    }

    this.assertMemberEligible(member);

    await this.dataSource.transaction(async (manager) => {
      await this.applyCompleteInTransaction(manager, transfer, member);
    });

    this.logger.log(`Transferência concluída: ${id} (membro ${memberId})`);
    return this.findOne(memberId, id);
  }

  async cancel(
    memberId: string,
    id: string,
  ): Promise<MemberTransferResponseDto> {
    const congregationId = await this.getCongregationId();
    await this.getMemberOrFail(memberId, congregationId);
    const transfer = await this.getTransferOrFail(id, memberId, congregationId);

    if (transfer.status !== MemberTransferStatus.PENDING) {
      throw new ApiException(HttpStatus.CONFLICT, {
        code: ApiErrorCode.MEMBERS_TRANSFER_INVALID_STATUS,
        message: ApiErrorMessage[ApiErrorCode.MEMBERS_TRANSFER_INVALID_STATUS],
      });
    }

    transfer.status = MemberTransferStatus.CANCELLED;
    await this.transfersRepository.save(transfer);

    this.logger.log(`Transferência cancelada: ${id} (membro ${memberId})`);
    return this.findOne(memberId, id);
  }

  private async applyCompleteInTransaction(
    manager: EntityManager,
    transfer: MemberTransfer,
    member: Member,
  ): Promise<void> {
    transfer.status = MemberTransferStatus.COMPLETED;
    transfer.approvedAt = new Date();
    await manager.save(transfer);

    member.status = MemberStatus.TRANSFERRED;
    await manager.save(member);

    if (transfer.documentId) {
      const document = await manager.findOne(SecretariatDocument, {
        where: { id: transfer.documentId },
      });
      if (document) {
        document.status = SecretariatDocumentStatus.FINAL;
        await manager.save(document);
      }
    }
  }

  private assertMemberEligible(member: Member): void {
    if (member.status !== MemberStatus.ACTIVE) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.MEMBERS_TRANSFER_MEMBER_NOT_ELIGIBLE,
        message:
          ApiErrorMessage[ApiErrorCode.MEMBERS_TRANSFER_MEMBER_NOT_ELIGIBLE],
      });
    }
  }

  private async getMemberOrFail(
    memberId: string,
    congregationId: string,
  ): Promise<Member> {
    const member = await this.membersRepository.findOne({
      where: { id: memberId, congregationId },
    });
    if (!member) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.MEMBERS_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.MEMBERS_NOT_FOUND],
      });
    }
    return member;
  }

  private async getTransferOrFail(
    id: string,
    memberId: string,
    congregationId: string,
  ): Promise<MemberTransfer> {
    const transfer = await this.transfersRepository.findOne({
      where: { id, memberId, congregationId },
      relations: { document: true, member: true },
    });
    if (!transfer) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.MEMBERS_TRANSFER_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.MEMBERS_TRANSFER_NOT_FOUND],
      });
    }
    return transfer;
  }

  private async getCongregationId(): Promise<string> {
    return (await this.congregationsService.getOrCreateBase()).id;
  }

  private buildLetterTitle(fullName: string): string {
    const prefix = 'Carta de recomendação — ';
    const maxNameLength = 200 - prefix.length;
    const safeName =
      fullName.length > maxNameLength
        ? fullName.slice(0, maxNameLength)
        : fullName;
    return `${prefix}${safeName}`;
  }

  private buildLetterSummary(input: {
    memberName: string;
    destinationChurchName: string;
    destinationCity: string;
    notes: string | null;
  }): string {
    const lines = [
      `Membro: ${input.memberName}`,
      `Igreja de destino: ${input.destinationChurchName}`,
      `Cidade de destino: ${input.destinationCity}`,
    ];
    if (input.notes) {
      lines.push(`Observações: ${input.notes}`);
    }
    return lines.join('\n');
  }

  private toLocalDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
