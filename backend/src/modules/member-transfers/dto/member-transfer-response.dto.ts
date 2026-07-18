import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MemberStatus } from '../../members/enums/member-status.enum';
import {
  SecretariatDocumentStatus,
  SecretariatDocumentType,
} from '../../secretariat/enums/secretariat.enums';
import { MemberTransfer } from '../entities/member-transfer.entity';
import { MemberTransferStatus } from '../enums/member-transfer-status.enum';

export class MemberTransferDocumentSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ enum: SecretariatDocumentType, example: 'letter' })
  type!: SecretariatDocumentType;

  @ApiProperty({ enum: SecretariatDocumentStatus })
  status!: SecretariatDocumentStatus;

  @ApiProperty({ example: '2026-07-18' })
  documentDate!: string;

  @ApiPropertyOptional({ nullable: true })
  summary!: string | null;

  @ApiProperty()
  hasFile!: boolean;
}

export class MemberTransferMemberSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty({ enum: MemberStatus })
  status!: MemberStatus;
}

export class MemberTransferResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  congregationId!: string;

  @ApiProperty()
  memberId!: string;

  @ApiProperty()
  destinationChurchName!: string;

  @ApiProperty()
  destinationCity!: string;

  @ApiProperty()
  requestedAt!: string;

  @ApiPropertyOptional({ nullable: true })
  approvedAt!: string | null;

  @ApiProperty({ enum: MemberTransferStatus })
  status!: MemberTransferStatus;

  @ApiPropertyOptional({ nullable: true })
  documentId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;

  @ApiProperty()
  requestedByUserId!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiPropertyOptional({
    type: MemberTransferDocumentSummaryDto,
    nullable: true,
  })
  document?: MemberTransferDocumentSummaryDto | null;

  @ApiPropertyOptional({ type: MemberTransferMemberSummaryDto, nullable: true })
  member?: MemberTransferMemberSummaryDto | null;

  static fromEntity(transfer: MemberTransfer): MemberTransferResponseDto {
    const dto = new MemberTransferResponseDto();
    dto.id = transfer.id;
    dto.congregationId = transfer.congregationId;
    dto.memberId = transfer.memberId;
    dto.destinationChurchName = transfer.destinationChurchName;
    dto.destinationCity = transfer.destinationCity;
    dto.requestedAt = transfer.requestedAt.toISOString();
    dto.approvedAt = transfer.approvedAt
      ? transfer.approvedAt.toISOString()
      : null;
    dto.status = transfer.status;
    dto.documentId = transfer.documentId;
    dto.notes = transfer.notes;
    dto.requestedByUserId = transfer.requestedByUserId;
    dto.createdAt = transfer.createdAt.toISOString();
    dto.updatedAt = transfer.updatedAt.toISOString();

    if (transfer.document) {
      dto.document = {
        id: transfer.document.id,
        title: transfer.document.title,
        type: transfer.document.type,
        status: transfer.document.status,
        documentDate: transfer.document.documentDate,
        summary: transfer.document.summary,
        hasFile: !!transfer.document.filePath,
      };
    } else {
      dto.document = null;
    }

    if (transfer.member) {
      dto.member = {
        id: transfer.member.id,
        fullName: transfer.member.fullName,
        status: transfer.member.status,
      };
    } else {
      dto.member = null;
    }

    return dto;
  }
}
