import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('produtos')
export class Produto {
  @PrimaryGeneratedColumn('identity')
  id: number;

  @Column({ type: 'text' })
  nome: string;

  @Column({ type: 'text', nullable: true })
  descricao: string | null;

  // numeric(10,2): dinheiro nunca em float. O driver pg devolve numeric como
  // string para não perder precisão, por isso o tipo aqui é string.
  @Column({ type: 'numeric', precision: 10, scale: 2 })
  preco: string;

  @Column({ type: 'int', default: 0 })
  estoque: number;

  // Só a chave do objeto no S3 (ex: "produtos/abc.jpg"), nunca a URL completa:
  // a URL depende do bucket/região/CDN e pode mudar sem o dado mudar.
  @Column({ name: 'imagem_key', type: 'text', nullable: true })
  imagemKey: string | null;

  @CreateDateColumn({ name: 'criado_em', type: 'timestamptz' })
  criadoEm: Date;

  @UpdateDateColumn({ name: 'atualizado_em', type: 'timestamptz' })
  atualizadoEm: Date;
}
