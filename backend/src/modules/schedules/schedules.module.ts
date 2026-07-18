import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Member } from '../members/entities/member.entity';
import { MinistryMember } from '../ministries/entities/ministry-member.entity';
import { Ministry } from '../ministries/entities/ministry.entity';
import { CalendarEvent } from '../secretariat/calendar/entities/calendar-event.entity';
import { ScheduleAssignment } from './entities/schedule-assignment.entity';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ScheduleAssignment,
      CalendarEvent,
      Ministry,
      MinistryMember,
      Member,
    ]),
  ],
  controllers: [SchedulesController],
  providers: [SchedulesService],
  exports: [SchedulesService],
})
export class SchedulesModule {}
