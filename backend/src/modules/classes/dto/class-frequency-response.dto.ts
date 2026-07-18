import { ApiProperty } from '@nestjs/swagger';

export class ClassFrequencyMemberDto {
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

export class ClassFrequencyReportDto {
  @ApiProperty({ format: 'uuid' })
  classId!: string;

  @ApiProperty({ example: 'Classe de Jovens' })
  className!: string;

  @ApiProperty({ example: '2026-01-01', format: 'date' })
  from!: string;

  @ApiProperty({ example: '2026-07-18', format: 'date' })
  to!: string;

  @ApiProperty({ example: 2 })
  sessionsCount!: number;

  @ApiProperty({ type: [ClassFrequencyMemberDto] })
  members!: ClassFrequencyMemberDto[];

  @ApiProperty({
    example: 50.0,
    description: 'Média simples dos frequencyPct dos alunos active',
  })
  classAveragePct!: number;
}
