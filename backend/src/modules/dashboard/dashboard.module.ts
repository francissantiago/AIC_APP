import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Announcement } from '../announcements/entities/announcement.entity';
import { AuthModule } from '../auth/auth.module';
import { CongregationsModule } from '../congregations/congregations.module';
import { FinancialEntry } from '../finance/entities/financial-entry.entity';
import { Member } from '../members/entities/member.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { AttendanceRecord } from '../secretariat/attendance/entities/attendance-record.entity';
import { CalendarEvent } from '../secretariat/calendar/entities/calendar-event.entity';
import { Visitor } from '../secretariat/visitors/entities/visitor.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Member,
      Visitor,
      AttendanceRecord,
      CalendarEvent,
      FinancialEntry,
      Notification,
      Announcement,
    ]),
    AuthModule,
    CongregationsModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
