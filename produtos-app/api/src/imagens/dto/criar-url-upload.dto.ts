import { IsIn } from 'class-validator';

import { TIPOS_ACEITOS, type TipoAceito } from '../imagens.service.js';

const tipos = Object.keys(TIPOS_ACEITOS);

export class CriarUrlUploadDto {
  @IsIn(tipos, { message: `contentType deve ser um de: ${tipos.join(', ')}` })
  contentType: TipoAceito;
}
