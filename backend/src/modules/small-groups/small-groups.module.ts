import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CongregationsModule } from '../congregations/congregations.module';
import { Member } from '../members/entities/member.entity';
import { SmallGroupAttendance } from './entities/small-group-attendance.entity';
import { SmallGroupMeeting } from './entities/small-group-meeting.entity';
import { SmallGroupMember } from './entities/small-group-member.entity';
import { SmallGroup } from './entities/small-group.entity';
import { SmallGroupsController } from './small-groups.controller';
import { SmallGroupsService } from './small-groups.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SmallGroup,
      SmallGroupMember,
      SmallGroupMeeting,
      SmallGroupAttendance,
      Member,
    ]),
    CongregationsModule,
  ],
  controllers: [SmallGroupsController],
  providers: [SmallGroupsService],
  exports: [SmallGroupsService],
})
export class SmallGroupsModule {}
