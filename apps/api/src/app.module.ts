import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import { validateEnvironment } from './config/environment.js';
import { CourtsModule } from './courts/courts.module.js';
import { FacilityController } from './facility/facility.controller.js';
import { HealthController } from './health/health.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    PrismaModule,
    AuthModule,
    CourtsModule,
  ],
  controllers: [HealthController, FacilityController],
})
export class AppModule {}
