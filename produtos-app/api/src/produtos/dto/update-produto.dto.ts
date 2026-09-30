import { PartialType } from '@nestjs/mapped-types';

import { CreateProdutoDto } from './create-produto.dto.js';

// PATCH: todos os campos opcionais, mas com as mesmas validações.
export class UpdateProdutoDto extends PartialType(CreateProdutoDto) {}
