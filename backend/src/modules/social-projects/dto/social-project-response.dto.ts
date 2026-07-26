import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SocialProject } from '../entities/social-project.entity';
import { SocialProjectCategory } from '../enums/social-project-category.enum';
import { SocialProjectStatus } from '../enums/social-project-status.enum';

export class SocialProjectResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  congregationId!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ enum: SocialProjectCategory })
  category!: SocialProjectCategory;

  @ApiPropertyOptional({ nullable: true })
  leaderMemberId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  leaderFullName!: string | null;

  @ApiProperty()
  dayOfWeek!: number;

  @ApiPropertyOptional({ nullable: true })
  startTime!: string | null;

  @ApiPropertyOptional({ nullable: true })
  location!: string | null;

  @ApiPropertyOptional({ nullable: true })
  budgetAmount!: string | null;

  @ApiProperty()
  spentAmount!: string;

  @ApiPropertyOptional({ nullable: true })
  budgetUsagePercent!: number | null;

  @ApiProperty({ enum: SocialProjectStatus })
  status!: SocialProjectStatus;

  @ApiPropertyOptional()
  membersCount?: number;

  @ApiPropertyOptional()
  sessionsCount?: number;

  @ApiPropertyOptional()
  expensesCount?: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromEntity(
    project: SocialProject,
    options?: {
      membersCount?: number;
      sessionsCount?: number;
      expensesCount?: number;
    },
  ): SocialProjectResponseDto {
    const dto = new SocialProjectResponseDto();
    dto.id = project.id;
    dto.congregationId = project.congregationId;
    dto.name = project.name;
    dto.description = project.description;
    dto.category = project.category;
    dto.leaderMemberId = project.leaderMemberId;
    dto.leaderFullName = project.leaderMember?.fullName ?? null;
    dto.dayOfWeek = project.dayOfWeek;
    dto.startTime = project.startTime;
    dto.location = project.location;
    dto.budgetAmount = project.budgetAmount;
    dto.spentAmount = project.spentAmount;
    dto.budgetUsagePercent = computeBudgetUsagePercent(
      project.spentAmount,
      project.budgetAmount,
    );
    dto.status = project.status;
    dto.createdAt = project.createdAt;
    dto.updatedAt = project.updatedAt;
    if (options?.membersCount !== undefined) {
      dto.membersCount = options.membersCount;
    }
    if (options?.sessionsCount !== undefined) {
      dto.sessionsCount = options.sessionsCount;
    }
    if (options?.expensesCount !== undefined) {
      dto.expensesCount = options.expensesCount;
    }
    return dto;
  }
}

export class PaginatedSocialProjectsResponseDto {
  @ApiProperty({ type: SocialProjectResponseDto, isArray: true })
  data!: SocialProjectResponseDto[];

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
