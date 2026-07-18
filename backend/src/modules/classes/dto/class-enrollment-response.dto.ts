import { ApiProperty } from '@nestjs/swagger';
import { ClassEnrollment } from '../entities/class-enrollment.entity';
import { ClassAgeGroup } from '../enums/class-age-group.enum';
import { ClassEnrollmentStatus } from '../enums/class-enrollment-status.enum';
import { ClassStatus } from '../enums/class-status.enum';

export class ClassEnrollmentResponseDto {
  @ApiProperty({ example: '4f6c1c1e-4a5b-4f0e-9d2a-9a3b8c7d6e5f' })
  classId!: string;

  @ApiProperty({ example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' })
  memberId!: string;

  @ApiProperty({ example: 'Maria da Silva' })
  memberFullName!: string;

  @ApiProperty({ enum: ClassEnrollmentStatus })
  status!: ClassEnrollmentStatus;

  @ApiProperty()
  enrolledAt!: Date;

  static fromEntity(link: ClassEnrollment): ClassEnrollmentResponseDto {
    const dto = new ClassEnrollmentResponseDto();
    dto.classId = link.classId;
    dto.memberId = link.memberId;
    dto.memberFullName = link.member?.fullName ?? '';
    dto.status = link.status;
    dto.enrolledAt = link.enrolledAt;
    return dto;
  }
}

export class PaginatedClassEnrollmentsResponseDto {
  @ApiProperty({ type: ClassEnrollmentResponseDto, isArray: true })
  data!: ClassEnrollmentResponseDto[];

  @ApiProperty({ example: 12 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;
}

export class ClassEnrollmentOptionDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  fullName!: string;
}

export class MemberClassSummaryDto {
  @ApiProperty({ example: '4f6c1c1e-4a5b-4f0e-9d2a-9a3b8c7d6e5f' })
  id!: string;

  @ApiProperty({ example: 'Classe de Jovens' })
  name!: string;

  @ApiProperty({ enum: ClassAgeGroup })
  ageGroup!: ClassAgeGroup;

  @ApiProperty({ enum: ClassStatus })
  status!: ClassStatus;

  @ApiProperty({ enum: ClassEnrollmentStatus })
  enrollmentStatus!: ClassEnrollmentStatus;

  @ApiProperty()
  enrolledAt!: Date;
}
