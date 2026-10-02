import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { migrations } from './database/migrations/index.js';
import { HealthModule } from './health/health.module.js';
import { ImagensModule } from './imagens/imagens.module.js';
import { ProdutosModule } from './produtos/produtos.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // O .env fica na raiz do repositório (é o mesmo que o docker-compose lê),
      // então as credenciais do banco existem em um só lugar.
      envFilePath: ['.env', '../.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('DB_HOST', 'localhost'),
        port: Number(config.get<string>('DB_PORT', '5432')),
        username: config.get<string>('POSTGRES_USER'),
        password: config.get<string>('POSTGRES_PASSWORD'),
        database: config.get<string>('POSTGRES_DB'),
        autoLoadEntities: true,
        migrations,
        // Schema é sempre responsabilidade das migrations. synchronize alteraria
        // as tabelas sozinho a partir das entidades — cômodo, e destrutivo.
        synchronize: false,
        migrationsRun: config.get<string>('DB_MIGRATIONS_RUN') !== 'false',
      }),
    }),
    HealthModule,
    ImagensModule,
    ProdutosModule,
  ],
})
export class AppModule {}
