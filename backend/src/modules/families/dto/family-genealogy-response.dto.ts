import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  GenealogyForest,
  GenealogyPersonCard,
  GenealogySpouseNode,
  GenealogyTreeNode,
} from '../utils/family-genealogy.util';

export class GenealogyPersonDto {
  @ApiProperty({ format: 'uuid' })
  memberId!: string;

  @ApiProperty({ example: 'Sofia Menezes Duarte' })
  fullName!: string;

  @ApiPropertyOptional({ example: '2010-05-12', nullable: true })
  birthDate!: string | null;

  static fromPerson(person: GenealogyPersonCard): GenealogyPersonDto {
    const dto = new GenealogyPersonDto();
    dto.memberId = person.memberId;
    dto.fullName = person.fullName;
    dto.birthDate = person.birthDate;
    return dto;
  }
}

export class GenealogySpouseDto extends GenealogyPersonDto {
  @ApiProperty({
    type: GenealogyPersonDto,
    isArray: true,
    description: 'Irmãos(ãs) deste cônjuge',
  })
  siblings!: GenealogyPersonDto[];

  static fromSpouse(spouse: GenealogySpouseNode): GenealogySpouseDto {
    const dto = new GenealogySpouseDto();
    dto.memberId = spouse.memberId;
    dto.fullName = spouse.fullName;
    dto.birthDate = spouse.birthDate;
    dto.siblings = spouse.siblings.map((sibling) =>
      GenealogyPersonDto.fromPerson(sibling),
    );
    return dto;
  }
}

export class GenealogyTreeNodeDto {
  @ApiProperty({ format: 'uuid' })
  memberId!: string;

  @ApiProperty({ example: 'Henrique Menezes Duarte' })
  fullName!: string;

  @ApiPropertyOptional({ example: '1980-01-10', nullable: true })
  birthDate!: string | null;

  @ApiProperty({
    type: GenealogyPersonDto,
    isArray: true,
    description: 'Irmãos(ãs) do membro principal deste nó',
  })
  siblings!: GenealogyPersonDto[];

  @ApiProperty({ type: GenealogySpouseDto, isArray: true })
  spouses!: GenealogySpouseDto[];

  @ApiProperty({ type: () => GenealogyTreeNodeDto, isArray: true })
  children!: GenealogyTreeNodeDto[];

  static fromNode(node: GenealogyTreeNode): GenealogyTreeNodeDto {
    const dto = new GenealogyTreeNodeDto();
    dto.memberId = node.memberId;
    dto.fullName = node.fullName;
    dto.birthDate = node.birthDate;
    dto.siblings = node.siblings.map((sibling) =>
      GenealogyPersonDto.fromPerson(sibling),
    );
    dto.spouses = node.spouses.map((spouse) =>
      GenealogySpouseDto.fromSpouse(spouse),
    );
    dto.children = node.children.map((child) =>
      GenealogyTreeNodeDto.fromNode(child),
    );
    return dto;
  }
}

export class FamilyGenealogyResponseDto {
  @ApiProperty({ format: 'uuid' })
  familyId!: string;

  @ApiProperty({ example: 'Família Duarte' })
  familyName!: string;

  @ApiProperty({ type: GenealogyTreeNodeDto, isArray: true })
  roots!: GenealogyTreeNodeDto[];

  @ApiProperty({
    type: GenealogyPersonDto,
    isArray: true,
    description: 'Membros sem vínculos na árvore',
  })
  unlinkedMembers!: GenealogyPersonDto[];

  static fromForest(
    familyId: string,
    familyName: string,
    forest: GenealogyForest,
  ): FamilyGenealogyResponseDto {
    const dto = new FamilyGenealogyResponseDto();
    dto.familyId = familyId;
    dto.familyName = familyName;
    dto.roots = forest.roots.map((root) => GenealogyTreeNodeDto.fromNode(root));
    dto.unlinkedMembers = forest.unlinkedMembers.map((member) =>
      GenealogyPersonDto.fromPerson(member),
    );
    return dto;
  }
}
