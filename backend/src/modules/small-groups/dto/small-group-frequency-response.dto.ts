import { ApiProperty } from '@nestjs/swagger';

export class SmallGroupFrequencyMemberDto {
  @ApiProperty({ format: 'uuid' })
  memberId!: string;

  @ApiProperty({ example: 'Maria da Silva' })
  memberFullName!: string;

  @ApiProperty({ example: 1 })
  presentCount!: number;

  @ApiProperty({ example: 1 })
  absentCount!: number;

  @ApiProperty({ example: 50.0 })
  frequencyPct!: number;
}

export class SmallGroupFrequencyReportDto {
  @ApiProperty({ format: 'uuid' })
  smallGroupId!: string;

  @ApiProperty({ example: 'Célula Centro' })
  smallGroupName!: string;

  @ApiProperty({ example: '2026-01-01', format: 'date' })
  from!: string;

  @ApiProperty({ example: '2026-07-18', format: 'date' })
  to!: string;

  @ApiProperty({
    example: 2,
    description: 'Quantidade de reuniões do grupo no período',
  })
  meetingsCount!: number;

  @ApiProperty({ type: [SmallGroupFrequencyMemberDto] })
  members!: SmallGroupFrequencyMemberDto[];

  @ApiProperty({
    example: 50.0,
    description: 'Média simples dos frequencyPct dos membros active',
  })
  groupAveragePct!: number;
}
