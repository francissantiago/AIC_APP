import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { CongregationsModule } from '../congregations/congregations.module';
import { MembersModule } from '../members/members.module';
import { Member } from '../members/entities/member.entity';
import { AttendanceController } from './attendance/attendance.controller';
import { AttendanceService } from './attendance/attendance.service';
import { AttendanceRecord } from './attendance/entities/attendance-record.entity';
import { CalendarController } from './calendar/calendar.controller';
import { CalendarService } from './calendar/calendar.service';
import { CalendarEvent } from './calendar/entities/calendar-event.entity';
import { GoogleCalendarConnection } from './calendar/entities/google-calendar-connection.entity';
import { GoogleCalendarEventLink } from './calendar/entities/google-calendar-event-link.entity';
import { GoogleCalendarController } from './calendar/google-calendar.controller';
import { GoogleCalendarJobsService } from './calendar/google-calendar-jobs.service';
import { GoogleCalendarOAuthService } from './calendar/google-calendar-oauth.service';
import { GoogleCalendarService } from './calendar/google-calendar.service';
import { GoogleCalendarSyncService } from './calendar/google-calendar-sync.service';
import { DocumentsController } from './documents/documents.controller';
import { DocumentsService } from './documents/documents.service';
import { SecretariatDocument } from './documents/entities/secretariat-document.entity';
import { SecretariatController } from './secretariat.controller';
import { SecretariatService } from './secretariat.service';
import { FileStorageService } from './storage/file-storage.service';
import { Visitor } from './visitors/entities/visitor.entity';
import { VisitorsController } from './visitors/visitors.controller';
import { VisitorsService } from './visitors/visitors.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CalendarEvent,
      GoogleCalendarConnection,
      GoogleCalendarEventLink,
      Visitor,
      AttendanceRecord,
      SecretariatDocument,
      Member,
    ]),
    AuthModule,
    CongregationsModule,
    MembersModule,
  ],
  controllers: [
    SecretariatController,
    CalendarController,
    GoogleCalendarController,
    VisitorsController,
    AttendanceController,
    DocumentsController,
  ],
  providers: [
    SecretariatService,
    CalendarService,
    GoogleCalendarService,
    GoogleCalendarOAuthService,
    GoogleCalendarSyncService,
    GoogleCalendarJobsService,
    VisitorsService,
    AttendanceService,
    DocumentsService,
    FileStorageService,
  ],
  exports: [SecretariatService, DocumentsService],
})
export class SecretariatModule {}
