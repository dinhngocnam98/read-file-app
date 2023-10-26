import { Config } from './config.interface';
import * as process from 'process';
import * as dotenv from 'dotenv';
dotenv.config();
const config: Config = {
  nest: {
    port: 3000,
  },
  cors: {
    enabled: true,
  },
  mongodb: {
    databaseUrl: process.env.DATABASE_URL,
  },
  swagger: {
    enabled: true,
    title: 'Read file API Documentation',
    description: 'The nestjs API documentation',
    version: '1.5',
    path: '/',
  },
};

export default (): Config => config;
