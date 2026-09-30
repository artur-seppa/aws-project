'use client';

import { useFormStatus } from 'react-dom';

import { removerProduto } from '@/app/produtos/actions';

function Botao({ nome }: { nome: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={`Remover ${nome}`}
      className="text-sm text-alert hover:underline disabled:opacity-60"
    >
      {pending ? 'Removendo…' : 'Remover'}
    </button>
  );
}

export function BotaoRemover({ id, nome }: { id: number; nome: string }) {
  return (
    <form
      action={removerProduto}
      onSubmit={(evento) => {
        // Remoção é irreversível e o clique fica ao lado de "Editar".
        if (!confirm(`Remover "${nome}"?`)) evento.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Botao nome={nome} />
    </form>
  );
}
