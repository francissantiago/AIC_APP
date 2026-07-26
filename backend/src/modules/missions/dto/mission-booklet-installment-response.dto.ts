import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MissionBookletInstallment } from '../entities/mission-booklet-installment.entity';
import { MissionBookletInstallmentStatus } from '../enums/mission-booklet-installment-status.enum';

export class MissionBookletInstallmentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  bookletId!: string;

  @ApiProperty()
  installmentNumber!: number;

  @ApiProperty()
  dueDate!: string;

  @ApiProperty()
  amount!: string;

  @ApiProperty({ enum: MissionBookletInstallmentStatus })
  status!: MissionBookletInstallmentStatus;

  @ApiPropertyOptional({ nullable: true })
  paidAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  financialEntryId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromEntity(
    installment: MissionBookletInstallment,
  ): MissionBookletInstallmentResponseDto {
    const dto = new MissionBookletInstallmentResponseDto();
    dto.id = installment.id;
    dto.bookletId = installment.bookletId;
    dto.installmentNumber = installment.installmentNumber;
    dto.dueDate = installment.dueDate;
    dto.amount = installment.amount;
    dto.status = installment.status;
    dto.paidAt = installment.paidAt;
    dto.financialEntryId = installment.financialEntryId;
    dto.notes = installment.notes;
    dto.createdAt = installment.createdAt;
    dto.updatedAt = installment.updatedAt;
    return dto;
  }
}

export class PaginatedMissionBookletInstallmentsResponseDto {
  @ApiProperty({ type: MissionBookletInstallmentResponseDto, isArray: true })
  data!: MissionBookletInstallmentResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
