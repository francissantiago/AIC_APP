import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EbdClass } from '../entities/class.entity';
import { ClassAgeGroup } from '../enums/class-age-group.enum';
import { ClassStatus } from '../enums/class-status.enum';

export class ClassTeacherSummaryDto {
  @ApiProperty({ example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' })
  id!: string;

  @ApiProperty({ example: 'Maria da Silva' })
  fullName!: string;
}

export class ClassResponseDto {
  @ApiProperty({ example: '4f6c1c1e-4a5b-4f0e-9d2a-9a3b8c7d6e5f' })
  id!: string;

  @ApiProperty({ example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' })
  congregationId!: string;

  @ApiProperty({ example: 'Classe de Jovens' })
  name!: string;

  @ApiPropertyOptional({
    example: 'Turma da EBD para jovens',
    nullable: true,
  })
  description!: string | null;

  @ApiProperty({ enum: ClassAgeGroup, example: ClassAgeGroup.YOUTH })
  ageGroup!: ClassAgeGroup;

  @ApiPropertyOptional({
    example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    nullable: true,
  })
  teacherMemberId!: string | null;

  @ApiPropertyOptional({ type: ClassTeacherSummaryDto, nullable: true })
  teacher!: ClassTeacherSummaryDto | null;

  @ApiProperty({ example: 0, minimum: 0, maximum: 6 })
  dayOfWeek!: number;

  @ApiPropertyOptional({ example: '09:00:00', nullable: true })
  startTime!: string | null;

  @ApiPropertyOptional({ example: 'Sala 3', nullable: true })
  room!: string | null;

  @ApiProperty({ enum: ClassStatus, example: ClassStatus.ACTIVE })
  status!: ClassStatus;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromEntity(ebdClass: EbdClass): ClassResponseDto {
    const dto = new ClassResponseDto();
    dto.id = ebdClass.id;
    dto.congregationId = ebdClass.congregationId;
    dto.name = ebdClass.name;
    dto.description = ebdClass.description;
    dto.ageGroup = ebdClass.ageGroup;
    dto.teacherMemberId = ebdClass.teacherMemberId;
    dto.teacher = ebdClass.teacherMember
      ? {
          id: ebdClass.teacherMember.id,
          fullName: ebdClass.teacherMember.fullName,
        }
      : null;
    dto.dayOfWeek = ebdClass.dayOfWeek;
    dto.startTime = ebdClass.startTime;
    dto.room = ebdClass.room;
    dto.status = ebdClass.status;
    dto.createdAt = ebdClass.createdAt;
    dto.updatedAt = ebdClass.updatedAt;
    return dto;
  }
}

export class PaginatedClassesResponseDto {
  @ApiProperty({ type: ClassResponseDto, isArray: true })
  data!: ClassResponseDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;
}

export class ClassTeacherOptionDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  fullName!: string;
}
