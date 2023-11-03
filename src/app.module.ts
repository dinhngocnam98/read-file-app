import { Module } from '@nestjs/common';
import { ReadReportModule } from './read-report/read-report.module';
import Config from './common/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongoDbConfig } from './common/config.interface';
import { AasModule } from './aas/aas.module';
import { UvModule } from './uv/uv.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [Config],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<MongoDbConfig>('mongodb').databaseUrl,
      }),
      inject: [ConfigService],
    }),
    UvModule,
    ReadReportModule,
    AasModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
