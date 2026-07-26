import { PartialType } from '@nestjs/swagger';
import { CreateSocialProjectSessionDto } from './create-social-project-session.dto';

export class UpdateSocialProjectSessionDto extends PartialType(
  CreateSocialProjectSessionDto,
) {}
