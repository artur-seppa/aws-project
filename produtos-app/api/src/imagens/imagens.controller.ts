import { Body, Controller, Get, Post } from '@nestjs/common';

import { CriarUrlUploadDto } from './dto/criar-url-upload.dto.js';
import { ImagensService } from './imagens.service.js';

@Controller('imagens')
export class ImagensController {
  constructor(private readonly imagens: ImagensService) {}

  /** O front usa isto para decidir se mostra o campo de imagem. */
  @Get('configuracao')
  configuracao() {
    return { habilitado: this.imagens.habilitado };
  }

  @Post('url-de-upload')
  criarUrlDeUpload(@Body() dto: CriarUrlUploadDto) {
    return this.imagens.criarUrlDeUpload(dto.contentType);
  }
}
