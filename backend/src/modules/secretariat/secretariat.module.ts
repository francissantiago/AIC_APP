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
    VisitorsController,
    AttendanceController,
    DocumentsController,
  ],
  providers: [
    SecretariatService,
    CalendarService,
    VisitorsService,
    AttendanceService,
    DocumentsService,
    FileStorageService,
  ],
  exports: [SecretariatService, DocumentsService],
})
export class SecretariatModule {}
