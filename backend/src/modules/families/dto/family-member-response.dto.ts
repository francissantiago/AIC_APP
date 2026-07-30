import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FamilyMember } from '../entities/family-member.entity';
import { FamilyRelation } from '../enums/family-relation.enum';
import { FamilyMemberLinkRelation } from '../enums/family-member-link-relation.enum';
import {
  buildMemberRelationBriefs,
  buildRelationSummarySegments,
  FamilyMemberRelationBrief,
  RelationSummarySegment,
} from '../utils/family-relation-summary.util';
import { FamilyMemberRelation } from '../entities/family-member-relation.entity';

export class FamilyMemberRelationBriefDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: FamilyMemberLinkRelation })
  relation!: FamilyMemberLinkRelation;

  @ApiProperty({ format: 'uuid' })
  relatedMemberId!: string;

  @ApiProperty({ example: 'João da Silva' })
  relatedMemberFullName!: string;

  @ApiProperty({ enum: ['outgoing', 'incoming'] })
  direction!: 'outgoing' | 'incoming';

  static fromBrief(
    brief: FamilyMemberRelationBrief,
  ): FamilyMemberRelationBriefDto {
    const dto = new FamilyMemberRelationBriefDto();
    dto.id = brief.id;
    dto.relation = brief.relation;
    dto.relatedMemberId = brief.relatedMemberId;
    dto.relatedMemberFullName = brief.relatedMemberFullName;
    dto.direction = brief.direction;
    return dto;
  }
}

export class RelationSummarySegmentDto {
  @ApiProperty({ example: 'FAMILIES.SUMMARY_CHILD_OF_ONE' })
  key!: string;

  @ApiProperty({ example: { parent: 'João da Silva' } })
  params!: Record<string, string>;

  static fromSegment(
    segment: RelationSummarySegment,
  ): RelationSummarySegmentDto {
    const dto = new RelationSummarySegmentDto();
    dto.key = segment.key;
    dto.params = segment.params;
    return dto;
  }
}

export class FamilyMemberResponseDto {
  @ApiProperty({ example: '4f6c1c1e-4a5b-4f0e-9d2a-9a3b8c7d6e5f' })
  familyId!: string;

  @ApiProperty({ example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' })
  memberId!: string;

  @ApiProperty({ example: 'Maria da Silva' })
  memberFullName!: string;

  @ApiProperty({ enum: FamilyRelation })
  relation!: FamilyRelation;

  @ApiProperty()
  joinedAt!: Date;

  @ApiPropertyOptional({ example: '1990-05-12', nullable: true })
  birthDate!: string | null;

  @ApiPropertyOptional({
    description: 'Segmentos i18n para montar resumo legível dos vínculos',
    type: RelationSummarySegmentDto,
    isArray: true,
  })
  relationSummarySegments?: RelationSummarySegmentDto[];

  @ApiPropertyOptional({
    type: FamilyMemberRelationBriefDto,
    isArray: true,
    description: 'Arestas explícitas em que o membro participa',
  })
  relations?: FamilyMemberRelationBriefDto[];

  static fromEntity(
    link: FamilyMember,
    options?: {
      familyRelations?: FamilyMemberRelation[];
    },
  ): FamilyMemberResponseDto {
    const dto = new FamilyMemberResponseDto();
    dto.familyId = link.familyId;
    dto.memberId = link.memberId;
    dto.memberFullName = link.member?.fullName ?? '';
    dto.relation = link.relation;
    dto.joinedAt = link.joinedAt;
    dto.birthDate = link.member?.birthDate ?? null;

    if (options?.familyRelations) {
      const stored = options.familyRelations.map((relation) => ({
        id: relation.id,
        fromMemberId: relation.fromMemberId,
        toMemberId: relation.toMemberId,
        relation: relation.relation,
        fromMemberFullName: relation.fromMember?.fullName ?? '',
        toMemberFullName: relation.toMember?.fullName ?? '',
      }));
      const briefs = buildMemberRelationBriefs(link.memberId, stored);
      dto.relations = briefs.map((brief) =>
        FamilyMemberRelationBriefDto.fromBrief(brief),
      );
      dto.relationSummarySegments = buildRelationSummarySegments(
        link.memberId,
        briefs,
      ).map((segment) => RelationSummarySegmentDto.fromSegment(segment));
    }

    return dto;
  }
}

export class PaginatedFamilyMembersResponseDto {
  @ApiProperty({ type: FamilyMemberResponseDto, isArray: true })
  data!: FamilyMemberResponseDto[];

  @ApiProperty({ example: 4 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;
}
