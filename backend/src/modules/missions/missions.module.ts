import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CongregationsModule } from '../congregations/congregations.module';
import { Member } from '../members/entities/member.entity';
import { MissionAssignment } from './entities/mission-assignment.entity';
import { MissionField } from './entities/mission-field.entity';
import { MissionAssignmentsController } from './mission-assignments.controller';
import { MissionAssignmentsService } from './mission-assignments.service';
import { MissionFieldsController } from './mission-fields.controller';
import { MissionFieldsService } from './mission-fields.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([MissionField, MissionAssignment, Member]),
    CongregationsModule,
  ],
  controllers: [MissionFieldsController, MissionAssignmentsController],
  providers: [MissionFieldsService, MissionAssignmentsService],
  exports: [MissionFieldsService, MissionAssignmentsService],
})
export class MissionsModule {}
