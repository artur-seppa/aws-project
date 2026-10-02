import { randomUUID } from 'node:crypto';

import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const TIPOS_ACEITOS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

export type TipoAceito = keyof typeof TIPOS_ACEITOS;

const VALIDADE_DO_UPLOAD = 300; // 5 min para escolher o arquivo e enviar
const VALIDADE_DA_LEITURA = 900; // 15 min: tempo de olhar a lista

@Injectable()
export class ImagensService {
  private readonly logger = new Logger(ImagensService.name);
  private readonly bucket?: string;
  private readonly cliente?: S3Client;

  constructor(config: ConfigService) {
    this.bucket = config.get<string>('S3_BUCKET');

    // Sem bucket configurado, o resto da API continua funcionando: só a parte
    // de imagem fica desligada.
    if (!this.bucket) return;

    // Sem credenciais explícitas: o SDK usa a cadeia padrão (variáveis de
    // ambiente, ~/.aws/credentials, ou a role da instância na EC2). Chave de
    // acesso nunca no código.
    this.cliente = new S3Client({
      region: config.get<string>('AWS_REGION', 'us-east-2'),
      // Por padrão o SDK assina um checksum CRC32 do corpo — que na hora de
      // assinar está vazio. O navegador manda o arquivo de verdade, o checksum
      // não bate e o S3 recusa. WHEN_REQUIRED desliga isso para o PUT.
      requestChecksumCalculation: 'WHEN_REQUIRED',
    });
  }

  get habilitado(): boolean {
    return Boolean(this.bucket && this.cliente);
  }

  private exigirHabilitado(): { bucket: string; cliente: S3Client } {
    if (!this.bucket || !this.cliente) {
      throw new ServiceUnavailableException(
        'Upload de imagem desabilitado: configure S3_BUCKET.',
      );
    }

    return { bucket: this.bucket, cliente: this.cliente };
  }

  /**
   * Devolve uma URL que autoriza UM PUT, daquele tipo, naquela chave, por 5
   * minutos. A assinatura é calculada aqui com HMAC sobre a chave secreta —
   * não há chamada à AWS neste método.
   */
  async criarUrlDeUpload(contentType: TipoAceito) {
    const { bucket, cliente } = this.exigirHabilitado();

    // A chave é gerada pelo servidor. Se viesse do cliente, ele poderia pedir
    // uma URL para sobrescrever a imagem de outro produto.
    const key = `produtos/${randomUUID()}.${TIPOS_ACEITOS[contentType]}`;

    const url = await getSignedUrl(
      cliente,
      // ContentType entra na assinatura: o navegador precisa enviar esse mesmo
      // header, então a URL não serve para subir um .html no lugar da foto.
      new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
      {
        expiresIn: VALIDADE_DO_UPLOAD,
        // Sem isto o SDK assina só o host, e a URL aceitaria qualquer tipo de
        // arquivo. Assinado, o navegador tem que mandar este mesmo header.
        signableHeaders: new Set(['content-type']),
      },
    );

    return { url, key, expiraEm: VALIDADE_DO_UPLOAD };
  }

  /**
   * URL temporária de leitura, para o bucket poder continuar privado.
   *
   * Nunca lança: a listagem assina uma URL por produto, e um erro aqui (por
   * exemplo, credencial que parou de resolver) derrubaria o catálogo inteiro
   * por causa de uma foto. Sem URL, o produto aparece sem imagem.
   */
  async criarUrlDeLeitura(key: string): Promise<string | null> {
    if (!this.bucket || !this.cliente) return null;

    try {
      return await getSignedUrl(
        this.cliente,
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
        { expiresIn: VALIDADE_DA_LEITURA },
      );
    } catch (erro) {
      this.logger.warn(
        `Não foi possível assinar a URL de ${key}: ${(erro as Error).message}`,
      );

      return null;
    }
  }

  /**
   * Apaga o objeto. Diferente do resto desta classe, aqui há chamada de rede.
   *
   * Nunca lança: é sempre chamado DEPOIS do commit no banco, e o produto já
   * está no estado certo. Se o S3 falhar, sobra um objeto órfão — desperdício,
   * não inconsistência visível. Falhar aqui e desfazer a operação do usuário
   * seria trocar um problema barato por um caro.
   */
  async apagar(key: string): Promise<void> {
    if (!this.bucket || !this.cliente) return;

    try {
      await this.cliente.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch (erro) {
      // A chave vai no log para dar o que reconciliar depois.
      this.logger.warn(
        `Objeto órfão no S3, não foi possível apagar ${key}: ${(erro as Error).message}`,
      );
    }
  }
}
