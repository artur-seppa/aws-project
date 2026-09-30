import { ProdutoForm } from '@/components/produto-form';

import { criarProduto } from '../actions';

export default function NovoProdutoPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Novo produto</h1>
      <div className="mt-8">
        <ProdutoForm action={criarProduto} textoDoBotao="Cadastrar produto" />
      </div>
    </div>
  );
}
