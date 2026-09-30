export function formatarPreco(preco: string): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(preco));
}

/**
 * A API espera "199.90". Quem digita em português escreve "199,90" — e às vezes
 * "1.299,90". Converte antes de enviar, em vez de reprovar o formato local.
 */
export function precoParaApi(valor: string): string {
  const limpo = valor.trim();

  if (limpo.includes(',')) {
    return limpo.replace(/\./g, '').replace(',', '.');
  }

  return limpo;
}
