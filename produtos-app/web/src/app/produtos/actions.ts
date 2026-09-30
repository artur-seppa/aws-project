'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import type { EstadoDoFormulario } from '@/lib/formulario';
import { precoParaApi } from '@/lib/formato';
import { API_URL, ErroDaApi } from '@/lib/produtos';

function montarCorpo(formData: FormData) {
  const descricao = String(formData.get('descricao') ?? '').trim();

  return {
    nome: String(formData.get('nome') ?? '').trim(),
    // String vazia no formulário significa "sem descrição", não a string "".
    descricao: descricao === '' ? null : descricao,
    preco: precoParaApi(String(formData.get('preco') ?? '')),
    estoque: Number(formData.get('estoque') ?? 0),
  };
}

async function enviar(url: string, method: 'POST' | 'PATCH', formData: FormData) {
  const resposta = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(montarCorpo(formData)),
  });

  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => null);
    const message = corpo?.message;

    throw new ErroDaApi(
      Array.isArray(message) ? message : [message ?? 'Não foi possível salvar.'],
      resposta.status,
    );
  }
}

export async function criarProduto(
  _estadoAnterior: EstadoDoFormulario,
  formData: FormData,
): Promise<EstadoDoFormulario> {
  try {
    await enviar(`${API_URL}/produtos`, 'POST', formData);
  } catch (erro) {
    return { erros: erro instanceof ErroDaApi ? erro.mensagens : ['Não foi possível salvar.'] };
  }

  // Fora do try: o redirect funciona lançando uma exceção, então um catch em
  // volta dele engoliria a navegação.
  revalidatePath('/produtos');
  redirect('/produtos');
}

export async function atualizarProduto(
  _estadoAnterior: EstadoDoFormulario,
  formData: FormData,
): Promise<EstadoDoFormulario> {
  const id = Number(formData.get('id'));

  try {
    await enviar(`${API_URL}/produtos/${id}`, 'PATCH', formData);
  } catch (erro) {
    return { erros: erro instanceof ErroDaApi ? erro.mensagens : ['Não foi possível salvar.'] };
  }

  revalidatePath('/produtos');
  redirect('/produtos');
}

export async function removerProduto(formData: FormData): Promise<void> {
  const id = Number(formData.get('id'));

  const resposta = await fetch(`${API_URL}/produtos/${id}`, { method: 'DELETE' });

  if (!resposta.ok && resposta.status !== 404) {
    throw new Error(`Não foi possível remover o produto ${id}.`);
  }

  revalidatePath('/produtos');
}
