import { Module } from '@nestjs/common';
import Config from './common/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongoDbConfig } from './common/config.interface';
import { Gc3Module } from './gc3/gc3.module';
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
    Gc3Module,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
