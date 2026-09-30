import Link from 'next/link';

import { BotaoRemover } from '@/components/botao-remover';
import { formatarPreco } from '@/lib/formato';
import { listarProdutos } from '@/lib/produtos';

const LIMITE = 20;

// Server Component: o fetch acontece no servidor, então API_URL nunca chega ao
// navegador e a página já vai renderizada com os dados.
export default async function ProdutosPage({
  searchParams,
}: PageProps<'/produtos'>) {
  const { cursor } = await searchParams;
  const cursorAtual = Number(cursor) || undefined;

  const { dados, proximoCursor } = await listarProdutos({
    limit: LIMITE,
    cursor: cursorAtual,
  });

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Catálogo</h1>
        <Link
          href="/produtos/novo"
          className="bg-accent px-3 py-2 text-sm font-medium text-paper"
        >
          Novo produto
        </Link>
      </div>

      {dados.length === 0 ? (
        <p className="mt-10 text-muted">
          Nenhum produto por aqui ainda.{' '}
          <Link href="/produtos/novo" className="text-accent underline">
            Cadastre o primeiro
          </Link>
          .
        </p>
      ) : (
        <table className="mt-8 w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-rule text-sm text-muted">
              <th className="py-2 font-medium">Nome</th>
              <th className="py-2 pr-4 text-right font-medium">Preço</th>
              <th className="py-2 pr-4 text-right font-medium">Estoque</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {dados.map((produto) => (
              <tr key={produto.id} className="border-b border-rule align-top">
                <td className="py-3 pr-4">
                  <span className="text-[15px]">{produto.nome}</span>
                  {produto.descricao && (
                    <span className="mt-0.5 block max-w-prose text-sm text-muted">
                      {produto.descricao}
                    </span>
                  )}
                </td>
                <td className="numeros py-3 pr-4 text-right text-[15px] whitespace-nowrap">
                  {formatarPreco(produto.preco)}
                </td>
                <td
                  className={`numeros py-3 pr-4 text-right text-[15px] ${
                    produto.estoque === 0 ? 'text-alert' : ''
                  }`}
                >
                  {produto.estoque}
                </td>
                <td className="py-3">
                  <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
                    <Link
                      href={`/produtos/${produto.id}/editar`}
                      className="text-sm text-accent hover:underline"
                    >
                      Editar
                    </Link>
                    <BotaoRemover id={produto.id} nome={produto.nome} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {(proximoCursor || cursorAtual) && (
        <nav className="mt-6 flex gap-4 text-sm">
          {cursorAtual && (
            <Link href="/produtos" className="text-muted underline">
              Primeira página
            </Link>
          )}
          {proximoCursor && (
            <Link
              href={`/produtos?cursor=${proximoCursor}`}
              className="text-accent underline"
            >
              Próxima página
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
