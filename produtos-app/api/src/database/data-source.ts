import { config } from 'dotenv';
import { DataSource } from 'typeorm';

import { Produto } from '../produtos/produto.entity.js';
import { migrations } from './migrations/index.js';

// Usado só pelo CLI do TypeORM (npm run migration:*). A aplicação monta a
// própria conexão em app.module.ts, via ConfigService.
config({ path: ['.env', '../.env'], quiet: true });

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  entities: [Produto],
  migrations,
  synchronize: false,
});
