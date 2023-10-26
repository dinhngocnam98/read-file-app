export interface Config {
  nest: NestConfig;
  cors: CorsConfig;
  mongodb: MongoDbConfig;
  swagger: SwaggerConfig;
}

export interface NestConfig {
  port: number;
}
export interface CorsConfig {
  enabled?: boolean;
}
export interface MongoDbConfig {
  databaseUrl: string;
}
export interface SwaggerConfig {
  enabled: boolean;
  title: string;
  description: string;
  version: string;
  path: string;
}
