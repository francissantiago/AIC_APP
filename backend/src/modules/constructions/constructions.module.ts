import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CongregationsModule } from '../congregations/congregations.module';
import { FinancialCategory } from '../finance/entities/financial-category.entity';
import { FinancialEntry } from '../finance/entities/financial-entry.entity';
import { FinanceModule } from '../finance/finance.module';
import { Member } from '../members/entities/member.entity';
import { Ministry } from '../ministries/entities/ministry.entity';
import { MinistriesModule } from '../ministries/ministries.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../secretariat/storage/storage.module';
import { User } from '../users/entities/user.entity';
import { ConstructionExpensesService } from './construction-expenses.service';
import { ConstructionNotificationsService } from './construction-notifications.service';
import { ConstructionPhotosController } from './construction-photos.controller';
import { ConstructionPhotosService } from './construction-photos.service';
import { ConstructionProjectsController } from './construction-projects.controller';
import { ConstructionProjectsService } from './construction-projects.service';
import { ConstructionUpdatesController } from './construction-updates.controller';
import { ConstructionUpdatesService } from './construction-updates.service';
import { ConstructionPhoto } from './entities/construction-photo.entity';
import { ConstructionProject } from './entities/construction-project.entity';
import { ConstructionUpdate } from './entities/construction-update.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ConstructionProject,
      ConstructionUpdate,
      ConstructionPhoto,
      FinancialEntry,
      FinancialCategory,
      Ministry,
      Member,
      User,
    ]),
    CongregationsModule,
    FinanceModule,
    NotificationsModule,
    StorageModule,
    MinistriesModule,
  ],
  controllers: [
    ConstructionProjectsController,
    ConstructionUpdatesController,
    ConstructionPhotosController,
  ],
  providers: [
    ConstructionProjectsService,
    ConstructionUpdatesService,
    ConstructionExpensesService,
    ConstructionPhotosService,
    ConstructionNotificationsService,
  ],
  exports: [
    ConstructionProjectsService,
    ConstructionUpdatesService,
    ConstructionExpensesService,
    ConstructionPhotosService,
  ],
})
export class ConstructionsModule {}
