import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ReadReportModule } from './read-report/read-report.module';
import Config from './common/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongoDbConfig } from './common/config.interface';

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
    ReadReportModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
