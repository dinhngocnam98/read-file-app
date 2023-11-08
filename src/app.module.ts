import { Module } from '@nestjs/common';
import Config from './common/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongoDbConfig } from './common/config.interface';
import { AasModule } from './aas/aas.module';
import { Uv2600Module } from './uv2600/uv2600.module';
import { Gc1Module } from './gc1/gc1.module';
import { Gc2Module } from './gc2/gc2.module';
import { Gc3Module } from './gc3/gc3.module';
import { Gc4Module } from './gc4/gc4.module';
import { Gc5Module } from './gc5/gc5.module';
import { HplcModule } from './hplc/hplc.module';
import { Uv1800Module } from './uv1800/uv1800.module';

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
    // Uv2600Module,
    // AasModule,
    // Gc1Module,
    Gc2Module,
    // Gc3Module,
    // Gc4Module,
    // Gc5Module,
    // HplcModule,
    // Uv1800Module,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
