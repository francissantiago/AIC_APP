import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsModule } from '../../infra/events/events.module';
import { CongregationsModule } from '../congregations/congregations.module';
import { ScheduleAssignment } from '../schedules/entities/schedule-assignment.entity';
import { Visitor } from '../secretariat/visitors/entities/visitor.entity';
import { User } from '../users/entities/user.entity';
import { Notification } from './entities/notification.entity';
import { NotificationsJobsService } from './notifications-jobs.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, Visitor, ScheduleAssignment, User]),
    EventsModule,
    CongregationsModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsJobsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
