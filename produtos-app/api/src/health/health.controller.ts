import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Usado pelo healthcheck do Docker. Não basta responder 200: a API só é
   * "saudável" se conseguir falar com o banco, então faz um SELECT de verdade.
   */
  @Get()
  async check() {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException({ status: 'erro', db: 'down' });
    }

    return { status: 'ok', db: 'up' };
  }
}
