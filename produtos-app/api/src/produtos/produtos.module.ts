import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ImagensModule } from '../imagens/imagens.module.js';
import { Produto } from './produto.entity.js';
import { ProdutosController } from './produtos.controller.js';
import { ProdutosService } from './produtos.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Produto]), ImagensModule],
  controllers: [ProdutosController],
  providers: [ProdutosService],
})
export class ProdutosModule {}
