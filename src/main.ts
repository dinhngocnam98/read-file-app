import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as process from 'process';
import { ConfigService } from '@nestjs/config';
import { CorsConfig } from './common/config.interface';
import * as dotenv from 'dotenv';
dotenv.config();
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // app.useGlobalPipes(new ValidationPipe());

  const configService = app.get(ConfigService);

  const corsConfig = configService.get<CorsConfig>('cors');

  if (corsConfig.enabled) {
    app.enableCors();
  }
  await app.listen(parseInt(process.env.PORT) || 3000);
}
bootstrap();
