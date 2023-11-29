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
<<<<<<< HEAD
    Gc3Module,
=======
    // Uv2600Module,
    // AasModule,
    // Gc1Module,
    // Gc2Module,
    Gc3Module,
    // Gc4Module,
    // Gc5Module,
    // HplcModule,
    // Uv1800Module,
>>>>>>> e753892f85c410370f9b0a25af20bb574e5069a5
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
