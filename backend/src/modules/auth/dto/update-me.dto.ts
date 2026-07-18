import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'updateMeAtLeastOne', async: false })
class UpdateMeAtLeastOneConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments): boolean {
    const obj = args.object as UpdateMeDto;
    return obj.fullName !== undefined || obj.email !== undefined;
  }

  defaultMessage(): string {
    return 'Informe ao menos um campo: fullName ou email';
  }
}

export class UpdateMeDto {
  @ApiPropertyOptional({ example: 'João da Silva', maxLength: 150 })
  @Validate(UpdateMeAtLeastOneConstraint)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  fullName?: string;

  @ApiPropertyOptional({ example: 'joao.silva@igreja.org', maxLength: 255 })
  @Validate(UpdateMeAtLeastOneConstraint)
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;
}
