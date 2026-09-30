'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import type { EstadoDoFormulario } from '@/lib/formulario';
import { estadoInicial } from '@/lib/formulario';
import type { Produto } from '@/lib/produtos';

interface Props {
  action: (
    estado: EstadoDoFormulario,
    formData: FormData,
  ) => Promise<EstadoDoFormulario>;
  produto?: Produto;
  textoDoBotao: string;
}

function Salvar({ texto }: { texto: string }) {
  // useFormStatus só funciona dentro do <form>, por isso é um componente à parte.
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-accent px-4 py-2 text-sm font-medium text-paper disabled:opacity-60"
    >
      {pending ? 'Salvando…' : texto}
    </button>
  );
}

const campo =
  'w-full border border-rule bg-paper px-3 py-2 text-[15px] text-ink placeholder:text-muted';
const rotulo = 'block text-sm text-muted';

export function ProdutoForm({ action, produto, textoDoBotao }: Props) {
  const [estado, formAction] = useActionState(action, estadoInicial);

  return (
    <form action={formAction} className="max-w-xl space-y-5">
      {produto && <input type="hidden" name="id" value={produto.id} />}

      {estado.erros.length > 0 && (
        <div className="border-l-2 border-alert bg-wash px-3 py-2 text-sm text-alert">
          <p>Corrija antes de salvar:</p>
          <ul className="mt-1 list-inside list-disc">
            {estado.erros.map((erro) => (
              <li key={erro}>{erro}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-1.5">
        <label className={rotulo} htmlFor="nome">
          Nome
        </label>
        <input
          id="nome"
          name="nome"
          required
          maxLength={200}
          defaultValue={produto?.nome}
          className={campo}
        />
      </div>

      <div className="space-y-1.5">
        <label className={rotulo} htmlFor="descricao">
          Descrição
        </label>
        <textarea
          id="descricao"
          name="descricao"
          rows={3}
          defaultValue={produto?.descricao ?? ''}
          className={campo}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className={rotulo} htmlFor="preco">
            Preço
          </label>
          <div className="flex items-center border border-rule bg-paper">
            <span className="pl-3 text-sm text-muted">R$</span>
            <input
              id="preco"
              name="preco"
              required
              inputMode="decimal"
              placeholder="199,90"
              defaultValue={produto?.preco.replace('.', ',')}
              className="numeros w-full bg-transparent px-2 py-2 text-[15px] text-ink placeholder:text-muted"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className={rotulo} htmlFor="estoque">
            Estoque
          </label>
          <input
            id="estoque"
            name="estoque"
            type="number"
            min={0}
            step={1}
            defaultValue={produto?.estoque ?? 0}
            className={`${campo} numeros`}
          />
        </div>
      </div>

      <div className="flex items-center gap-4 pt-1">
        <Salvar texto={textoDoBotao} />
        <Link href="/produtos" className="text-sm text-muted underline">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
