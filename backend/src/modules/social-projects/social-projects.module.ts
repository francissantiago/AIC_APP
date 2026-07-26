import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CongregationsModule } from '../congregations/congregations.module';
import { FinancialCategory } from '../finance/entities/financial-category.entity';
import { FinancialEntry } from '../finance/entities/financial-entry.entity';
import { FinanceModule } from '../finance/finance.module';
import { Member } from '../members/entities/member.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { User } from '../users/entities/user.entity';
import { SocialProjectAttendance } from './entities/social-project-attendance.entity';
import { SocialProjectMember } from './entities/social-project-member.entity';
import { SocialProjectSession } from './entities/social-project-session.entity';
import { SocialProject } from './entities/social-project.entity';
import { SocialProjectExpensesService } from './social-project-expenses.service';
import { SocialProjectNotificationsService } from './social-project-notifications.service';
import { SocialProjectSessionsController } from './social-project-sessions.controller';
import { SocialProjectSessionsService } from './social-project-sessions.service';
import { SocialProjectsController } from './social-projects.controller';
import { SocialProjectsService } from './social-projects.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SocialProject,
      SocialProjectMember,
      SocialProjectSession,
      SocialProjectAttendance,
      FinancialEntry,
      FinancialCategory,
      Member,
      User,
    ]),
    CongregationsModule,
    FinanceModule,
    NotificationsModule,
  ],
  controllers: [SocialProjectSessionsController, SocialProjectsController],
  providers: [
    SocialProjectsService,
    SocialProjectSessionsService,
    SocialProjectExpensesService,
    SocialProjectNotificationsService,
  ],
  exports: [
    SocialProjectsService,
    SocialProjectSessionsService,
    SocialProjectExpensesService,
  ],
})
export class SocialProjectsModule {}
