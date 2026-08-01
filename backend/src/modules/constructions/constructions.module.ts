import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CongregationsModule } from '../congregations/congregations.module';
import { FinancialCategory } from '../finance/entities/financial-category.entity';
import { FinancialEntry } from '../finance/entities/financial-entry.entity';
import { FinanceModule } from '../finance/finance.module';
import { Member } from '../members/entities/member.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../secretariat/storage/storage.module';
import { User } from '../users/entities/user.entity';
import { ConstructionExpensesService } from './construction-expenses.service';
import { ConstructionNotificationsService } from './construction-notifications.service';
import { ConstructionPhotosController } from './construction-photos.controller';
import { ConstructionPhotosService } from './construction-photos.service';
import { ConstructionProjectStagesService } from './construction-project-stages.service';
import { ConstructionProjectsController } from './construction-projects.controller';
import { ConstructionProjectsService } from './construction-projects.service';
import { ConstructionUpdatesController } from './construction-updates.controller';
import { ConstructionUpdatesService } from './construction-updates.service';
import { ConstructionPhoto } from './entities/construction-photo.entity';
import { ConstructionProjectStage } from './entities/construction-project-stage.entity';
import { ConstructionProject } from './entities/construction-project.entity';
import { ConstructionUpdate } from './entities/construction-update.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ConstructionProject,
      ConstructionProjectStage,
      ConstructionUpdate,
      ConstructionPhoto,
      FinancialEntry,
      FinancialCategory,
      Member,
      User,
    ]),
    CongregationsModule,
    FinanceModule,
    NotificationsModule,
    StorageModule,
  ],
  controllers: [
    ConstructionProjectsController,
    ConstructionUpdatesController,
    ConstructionPhotosController,
  ],
  providers: [
    ConstructionProjectsService,
    ConstructionProjectStagesService,
    ConstructionUpdatesService,
    ConstructionExpensesService,
    ConstructionPhotosService,
    ConstructionNotificationsService,
  ],
  exports: [
    ConstructionProjectsService,
    ConstructionProjectStagesService,
    ConstructionUpdatesService,
    ConstructionExpensesService,
    ConstructionPhotosService,
  ],
})
export class ConstructionsModule {}
