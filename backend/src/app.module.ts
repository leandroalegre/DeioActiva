import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { ModulesModule } from './modules/modules.module';
import { WorkItemsModule } from './work-items/work-items.module';
import { CommentsModule } from './comments/comments.module';
import { HistoryModule } from './history/history.module';
import { MilestonesModule } from './milestones/milestones.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    RolesModule,
    ModulesModule,
    WorkItemsModule,
    CommentsModule,
    HistoryModule,
    MilestonesModule,
  ],
  controllers: [AppController],
  providers: [
    // JwtAuthGuard corre primero: exige un JWT valido salvo en endpoints @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // RolesGuard corre despues: si la ruta tiene @Roles(...), valida el rol del usuario.
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
