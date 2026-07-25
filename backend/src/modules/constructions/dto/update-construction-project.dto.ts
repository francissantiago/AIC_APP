import { PartialType } from '@nestjs/swagger';
import { CreateConstructionProjectDto } from './create-construction-project.dto';

export class UpdateConstructionProjectDto extends PartialType(
  CreateConstructionProjectDto,
) {}
