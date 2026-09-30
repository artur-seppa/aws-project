import { CriaProdutos1727740000000 } from './1727740000000-CriaProdutos.js';

// As migrations são listadas à mão, na ordem, em vez de por glob: em ESM o
// carregamento de arquivos por glob do TypeORM é frágil. Ao criar uma migration
// nova, importe-a aqui.
export const migrations = [CriaProdutos1727740000000];
