import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CongregationsModule } from '../congregations/congregations.module';
import { Member } from '../members/entities/member.entity';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';
import { ClassAttendance } from './entities/class-attendance.entity';
import { ClassEnrollment } from './entities/class-enrollment.entity';
import { EbdClass } from './entities/class.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EbdClass,
      ClassEnrollment,
      ClassAttendance,
      Member,
    ]),
    CongregationsModule,
  ],
  controllers: [ClassesController],
  providers: [ClassesService],
  exports: [ClassesService],
})
export class ClassesModule {}
