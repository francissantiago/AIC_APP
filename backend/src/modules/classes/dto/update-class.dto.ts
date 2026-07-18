import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsUUID, ValidateIf } from 'class-validator';
import { CreateClassDto } from './create-class.dto';

export class UpdateClassDto extends PartialType(CreateClassDto) {
  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Enviar null para desvincular o professor',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsUUID()
  teacherMemberId?: string | null;
}
