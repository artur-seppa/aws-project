import { Module } from '@nestjs/common';

import { ImagensController } from './imagens.controller.js';
import { ImagensService } from './imagens.service.js';

@Module({
  controllers: [ImagensController],
  providers: [ImagensService],
  exports: [ImagensService],
})
export class ImagensModule {}
