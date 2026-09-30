export interface EstadoDoFormulario {
  erros: string[];
}

// Fica fora do actions.ts porque um arquivo 'use server' só pode exportar
// funções async — valores comuns precisam morar em outro módulo.
export const estadoInicial: EstadoDoFormulario = { erros: [] };
