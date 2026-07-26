import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CongregationsModule } from '../congregations/congregations.module';
import { FinancialCategory } from '../finance/entities/financial-category.entity';
import { FinancialEntry } from '../finance/entities/financial-entry.entity';
import { Member } from '../members/entities/member.entity';
import { MissionAssignment } from './entities/mission-assignment.entity';
import { MissionBookletInstallment } from './entities/mission-booklet-installment.entity';
import { MissionBooklet } from './entities/mission-booklet.entity';
import { MissionField } from './entities/mission-field.entity';
import { MissionAssignmentsController } from './mission-assignments.controller';
import { MissionAssignmentsService } from './mission-assignments.service';
import { MissionBookletsController } from './mission-booklets.controller';
import { MissionBookletsService } from './mission-booklets.service';
import { MissionFieldsController } from './mission-fields.controller';
import { MissionFieldsService } from './mission-fields.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MissionField,
      MissionAssignment,
      MissionBooklet,
      MissionBookletInstallment,
      Member,
      FinancialEntry,
      FinancialCategory,
    ]),
    CongregationsModule,
  ],
  controllers: [
    MissionFieldsController,
    MissionAssignmentsController,
    MissionBookletsController,
  ],
  providers: [
    MissionFieldsService,
    MissionAssignmentsService,
    MissionBookletsService,
  ],
  exports: [
    MissionFieldsService,
    MissionAssignmentsService,
    MissionBookletsService,
  ],
})
export class MissionsModule {}
