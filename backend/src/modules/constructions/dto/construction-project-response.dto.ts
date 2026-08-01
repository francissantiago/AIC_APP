import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConstructionProject } from '../entities/construction-project.entity';
import { ConstructionProjectStatus } from '../enums/construction-project-status.enum';

export class ConstructionProjectResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  congregationId!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ nullable: true })
  location!: string | null;

  @ApiProperty({ enum: ConstructionProjectStatus })
  status!: ConstructionProjectStatus;

  @ApiProperty()
  progressPercent!: number;

  @ApiPropertyOptional({ nullable: true })
  budgetAmount!: string | null;

  @ApiProperty()
  spentAmount!: string;

  @ApiPropertyOptional({ nullable: true })
  budgetUsagePercent!: number | null;

  @ApiPropertyOptional({ nullable: true })
  startDate!: string | null;

  @ApiPropertyOptional({ nullable: true })
  expectedEndDate!: string | null;

  @ApiPropertyOptional({ nullable: true })
  actualEndDate!: string | null;

  @ApiPropertyOptional({ nullable: true })
  supervisorMemberId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  supervisorMemberName!: string | null;

  @ApiPropertyOptional()
  updatesCount?: number;

  @ApiPropertyOptional()
  photosCount?: number;

  @ApiPropertyOptional()
  expensesCount?: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromEntity(
    project: ConstructionProject,
    options?: {
      updatesCount?: number;
      photosCount?: number;
      expensesCount?: number;
    },
  ): ConstructionProjectResponseDto {
    const dto = new ConstructionProjectResponseDto();
    dto.id = project.id;
    dto.congregationId = project.congregationId;
    dto.name = project.name;
    dto.description = project.description;
    dto.location = project.location;
    dto.status = project.status;
    dto.progressPercent = project.progressPercent;
    dto.budgetAmount = project.budgetAmount;
    dto.spentAmount = project.spentAmount;
    dto.budgetUsagePercent = computeBudgetUsagePercent(
      project.spentAmount,
      project.budgetAmount,
    );
    dto.startDate = project.startDate;
    dto.expectedEndDate = project.expectedEndDate;
    dto.actualEndDate = project.actualEndDate;
    dto.supervisorMemberId = project.supervisorMemberId;
    dto.supervisorMemberName = project.supervisorMember?.fullName ?? null;
    dto.createdAt = project.createdAt;
    dto.updatedAt = project.updatedAt;
    if (options?.updatesCount !== undefined) {
      dto.updatesCount = options.updatesCount;
    }
    if (options?.photosCount !== undefined) {
      dto.photosCount = options.photosCount;
    }
    if (options?.expensesCount !== undefined) {
      dto.expensesCount = options.expensesCount;
    }
    return dto;
  }
}

export class PaginatedConstructionProjectsResponseDto {
  @ApiProperty({ type: ConstructionProjectResponseDto, isArray: true })
  data!: ConstructionProjectResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}

function computeBudgetUsagePercent(
  spentAmount: string,
  budgetAmount: string | null,
): number | null {
  if (!budgetAmount) return null;
  const budget = Number(budgetAmount);
  const spent = Number(spentAmount);
  if (!Number.isFinite(budget) || budget <= 0) return null;
  return Math.round((spent / budget) * 10000) / 100;
}
