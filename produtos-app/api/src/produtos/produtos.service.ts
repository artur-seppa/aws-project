import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { CreateProdutoDto } from './dto/create-produto.dto.js';
import type { ListarProdutosDto } from './dto/listar-produtos.dto.js';
import type { UpdateProdutoDto } from './dto/update-produto.dto.js';
import { Produto } from './produto.entity.js';

export interface PaginaDeProdutos {
  dados: Produto[];
  proximoCursor: number | null;
}

@Injectable()
export class ProdutosService {
  constructor(
    @InjectRepository(Produto)
    private readonly produtos: Repository<Produto>,
  ) {}

  /**
   * Paginação keyset: filtra por `id > cursor` em vez de OFFSET. O banco pula
   * direto pelo índice da PK, então a página 1000 custa o mesmo que a página 1
   * — com OFFSET ele teria que ler e descartar todas as linhas anteriores.
   */
  async listar({ limit = 20, cursor }: ListarProdutosDto): Promise<PaginaDeProdutos> {
    const qb = this.produtos
      .createQueryBuilder('produto')
      .orderBy('produto.id', 'ASC')
      // Pede um a mais para saber se existe próxima página sem um COUNT extra.
      .take(limit + 1);

    if (cursor !== undefined) {
      qb.where('produto.id > :cursor', { cursor });
    }

    const linhas = await qb.getMany();
    const temMais = linhas.length > limit;
    const dados = temMais ? linhas.slice(0, limit) : linhas;

    return {
      dados,
      proximoCursor: temMais ? dados[dados.length - 1].id : null,
    };
  }

  async buscarPorId(id: number): Promise<Produto> {
    const produto = await this.produtos.findOneBy({ id });

    if (!produto) {
      throw new NotFoundException(`Produto ${id} não encontrado`);
    }

    return produto;
  }

  async criar(dto: CreateProdutoDto): Promise<Produto> {
    const produto = await this.produtos.save(this.produtos.create(dto));

    // Relê do banco: o save devolve o objeto em memória, então `preco` voltaria
    // como "199.9" enquanto o numeric(10,2) gravado é "199.90".
    return this.buscarPorId(produto.id);
  }

  async atualizar(id: number, dto: UpdateProdutoDto): Promise<Produto> {
    const produto = await this.buscarPorId(id);

    // merge + save (em vez de update) para o @UpdateDateColumn ser preenchido
    // e para a entidade voltar já com os valores novos.
    this.produtos.merge(produto, dto);
    await this.produtos.save(produto);

    return this.buscarPorId(id);
  }

  async remover(id: number): Promise<void> {
    const resultado = await this.produtos.delete({ id });

    if (!resultado.affected) {
      throw new NotFoundException(`Produto ${id} não encontrado`);
    }
  }
}
