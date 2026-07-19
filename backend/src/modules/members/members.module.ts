import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassesModule } from '../classes/classes.module';
import { CongregationsModule } from '../congregations/congregations.module';
import { MinistriesModule } from '../ministries/ministries.module';
import { User } from '../users/entities/user.entity';
import { Member } from './entities/member.entity';
import { MembersController } from './members.controller';
import { MemberBirthdayCalendarSyncService } from './member-birthday-calendar.sync.service';
import { MembersService } from './members.service';
import { CalendarEvent } from '../secretariat/calendar/entities/calendar-event.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Member, User, CalendarEvent]),
    CongregationsModule,
    MinistriesModule,
    ClassesModule,
  ],
  controllers: [MembersController],
  providers: [MembersService, MemberBirthdayCalendarSyncService],
  exports: [MembersService],
})
export class MembersModule {}
