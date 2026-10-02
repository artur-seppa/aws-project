import { notFound } from 'next/navigation';

import { ProdutoForm } from '@/components/produto-form';
import { buscarProduto, imagemHabilitada } from '@/lib/produtos';

import { atualizarProduto } from '../../actions';

export default async function EditarProdutoPage({
  params,
}: PageProps<'/produtos/[id]/editar'>) {
  const { id } = await params;
  const produto = await buscarProduto(Number(id));

  // 404 da API vira o not-found do Next, em vez de uma tela de erro.
  if (!produto) notFound();

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{produto.nome}</h1>
      <p className="mt-1 text-sm text-muted">Produto #{produto.id}</p>
      <div className="mt-8">
        <ProdutoForm
          action={atualizarProduto}
          produto={produto}
          textoDoBotao="Salvar alterações"
          uploadHabilitado={await imagemHabilitada()}
        />
      </div>
    </div>
  );
}
