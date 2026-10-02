import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ImagensService } from '../imagens/imagens.service.js';
import type { CreateProdutoDto } from './dto/create-produto.dto.js';
import type { ListarProdutosDto } from './dto/listar-produtos.dto.js';
import type { UpdateProdutoDto } from './dto/update-produto.dto.js';
import { Produto } from './produto.entity.js';

// O que sai na API: a entidade mais a URL temporária de leitura da imagem.
export type ProdutoResposta = Produto & { imagemUrl: string | null };

export interface PaginaDeProdutos {
  dados: ProdutoResposta[];
  proximoCursor: number | null;
}

@Injectable()
export class ProdutosService {
  constructor(
    @InjectRepository(Produto)
    private readonly produtos: Repository<Produto>,
    private readonly imagens: ImagensService,
  ) {}

  /**
   * A entidade guarda só a chave do objeto. A URL é assinada na hora de
   * responder — assim o bucket continua privado e o link expira sozinho.
   * Assinar é cálculo local, então fazer isso para a página inteira é barato.
   */
  private async comImagem(produto: Produto): Promise<ProdutoResposta> {
    return {
      // O spread perde o prototype da entidade, e tudo bem: isto vira JSON na
      // resposta, não volta para o repositório.
      // oxlint-disable-next-line no-misused-spread
      ...produto,
      imagemUrl: produto.imagemKey
        ? await this.imagens.criarUrlDeLeitura(produto.imagemKey)
        : null,
    };
  }

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
      dados: await Promise.all(dados.map((produto) => this.comImagem(produto))),
      proximoCursor: temMais ? dados[dados.length - 1].id : null,
    };
  }

  async buscarPorId(id: number): Promise<ProdutoResposta> {
    return this.comImagem(await this.buscarEntidade(id));
  }

  private async buscarEntidade(id: number): Promise<Produto> {
    const produto = await this.produtos.findOneBy({ id });

    if (!produto) {
      throw new NotFoundException(`Produto ${id} não encontrado`);
    }

    return produto;
  }

  async criar(dto: CreateProdutoDto): Promise<ProdutoResposta> {
    const produto = await this.produtos.save(this.produtos.create(dto));

    // Relê do banco: o save devolve o objeto em memória, então `preco` voltaria
    // como "199.9" enquanto o numeric(10,2) gravado é "199.90".
    return this.buscarPorId(produto.id);
  }

  async atualizar(id: number, dto: UpdateProdutoDto): Promise<ProdutoResposta> {
    const produto = await this.buscarEntidade(id);
    const chaveAntiga = produto.imagemKey;

    // merge + save (em vez de update) para o @UpdateDateColumn ser preenchido
    // e para a entidade voltar já com os valores novos.
    this.produtos.merge(produto, dto);
    await this.produtos.save(produto);

    // Só depois do commit: se o banco falhasse, a imagem teria sido apagada de
    // um produto que continua apontando para ela.
    if (chaveAntiga && chaveAntiga !== produto.imagemKey) {
      await this.imagens.apagar(chaveAntiga);
    }

    return this.buscarPorId(id);
  }

  async remover(id: number): Promise<void> {
    // Busca antes de apagar para saber qual objeto do S3 ficou sem dono.
    const produto = await this.buscarEntidade(id);

    await this.produtos.delete({ id });

    if (produto.imagemKey) {
      await this.imagens.apagar(produto.imagemKey);
    }
  }
}
