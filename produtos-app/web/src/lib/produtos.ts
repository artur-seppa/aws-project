export interface Produto {
  id: number;
  nome: string;
  descricao: string | null;
  preco: string;
  estoque: number;
  imagemKey: string | null;
  // URL assinada e temporária, montada pela API na hora de responder.
  imagemUrl: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface PaginaDeProdutos {
  dados: Produto[];
  proximoCursor: number | null;
}

// Só server-side: API_URL não tem o prefixo NEXT_PUBLIC_, então nunca vai para
// o bundle do navegador. Dentro do Docker vira http://api:3333.
export const API_URL = process.env.API_URL ?? 'http://localhost:3333';

export class ErroDaApi extends Error {
  constructor(readonly mensagens: string[], readonly status: number) {
    super(mensagens.join('; '));
  }
}

async function lerErro(resposta: Response): Promise<never> {
  let mensagens = [`A API respondeu ${resposta.status}.`];

  try {
    const corpo = await resposta.json();
    if (Array.isArray(corpo.message)) mensagens = corpo.message;
    else if (typeof corpo.message === 'string') mensagens = [corpo.message];
  } catch {
    // Resposta sem JSON: fica a mensagem genérica.
  }

  throw new ErroDaApi(mensagens, resposta.status);
}

export async function listarProdutos(params: {
  limit?: number;
  cursor?: number;
}): Promise<PaginaDeProdutos> {
  const query = new URLSearchParams({ limit: String(params.limit ?? 20) });
  if (params.cursor) query.set('cursor', String(params.cursor));

  // no-store: estoque e preço mudam a toda hora, não faz sentido servir cache.
  const resposta = await fetch(`${API_URL}/produtos?${query}`, {
    cache: 'no-store',
  });

  if (!resposta.ok) await lerErro(resposta);

  return resposta.json();
}

export async function buscarProduto(id: number): Promise<Produto | null> {
  const resposta = await fetch(`${API_URL}/produtos/${id}`, {
    cache: 'no-store',
  });

  if (resposta.status === 404) return null;
  if (!resposta.ok) await lerErro(resposta);

  return resposta.json();
}

export async function imagemHabilitada(): Promise<boolean> {
  try {
    const resposta = await fetch(`${API_URL}/imagens/configuracao`, {
      cache: 'no-store',
    });

    if (!resposta.ok) return false;

    return (await resposta.json()).habilitado === true;
  } catch {
    // Se a API não responder, o front só esconde o campo de imagem.
    return false;
  }
}
