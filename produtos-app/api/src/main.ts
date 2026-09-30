import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      // Remove campos que não estão no DTO...
      whitelist: true,
      // ...e, em vez de ignorá-los em silêncio, devolve 400 dizendo qual sobrou.
      forbidNonWhitelisted: true,
      // Converte o payload na classe do DTO e aplica os @Type (query string
      // chega sempre como texto).
      transform: true,
    }),
  );

  app.enableCors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000' });

  // 0.0.0.0 e não localhost: dentro de um container, escutar só no loopback
  // deixaria a porta publicada inacessível de fora.
  await app.listen(process.env.PORT ?? 3333, '0.0.0.0');
}

await bootstrap();
