'use client';

import { useRef, useState } from 'react';

import { pedirUrlDeUpload } from '@/app/produtos/actions';

const TAMANHO_MAXIMO = 5 * 1024 * 1024; // 5 MB

interface Props {
  imagemKeyInicial: string | null;
  imagemUrlInicial: string | null;
}

export function CampoDeImagem({ imagemKeyInicial, imagemUrlInicial }: Props) {
  const [key, setKey] = useState(imagemKeyInicial ?? '');
  const [previa, setPrevia] = useState(imagemUrlInicial);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function enviar(arquivo: File) {
    setErro(null);

    if (arquivo.size > TAMANHO_MAXIMO) {
      setErro('A imagem precisa ter no máximo 5 MB.');
      return;
    }

    setEnviando(true);

    try {
      // 1. A API assina uma URL de PUT para este tipo de arquivo.
      const resultado = await pedirUrlDeUpload(arquivo.type);

      if ('erro' in resultado) {
        setErro(resultado.erro);
        return;
      }

      // 2. O arquivo sobe do navegador direto para o S3. O Content-Type tem que
      //    ser exatamente o que foi assinado, senão o S3 recusa.
      const resposta = await fetch(resultado.url, {
        method: 'PUT',
        headers: { 'Content-Type': arquivo.type },
        body: arquivo,
      });

      if (!resposta.ok) {
        setErro(`O S3 recusou o envio (${resposta.status}).`);
        return;
      }

      // 3. Guardamos só a chave; ela é salva junto com o produto.
      setKey(resultado.key);
      setPrevia(URL.createObjectURL(arquivo));
    } catch {
      setErro('Falha de rede ao enviar a imagem.');
    } finally {
      setEnviando(false);
    }
  }

  function remover() {
    setKey('');
    setPrevia(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="space-y-2">
      <span className="block text-sm text-muted">Imagem</span>

      {/* O que é salvo no produto é a chave, não o arquivo. */}
      <input type="hidden" name="imagemKey" value={key} />

      <div className="flex items-start gap-4">
        {previa && (
          // next/image não serve aqui: a URL é assinada, expira, e o host vem
          // do ambiente — não dá para declarar em remotePatterns no build.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previa}
            alt="Prévia da imagem do produto"
            className="h-20 w-20 border border-rule object-cover"
          />
        )}

        <div className="space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={enviando}
            onChange={(evento) => {
              const arquivo = evento.target.files?.[0];
              if (arquivo) void enviar(arquivo);
            }}
            className="block text-sm text-muted file:mr-3 file:border file:border-rule file:bg-wash file:px-3 file:py-1.5 file:text-ink"
          />

          {enviando && <p className="text-sm text-muted">Enviando…</p>}
          {erro && <p className="text-sm text-alert">{erro}</p>}
          {key && !enviando && (
            <button
              type="button"
              onClick={remover}
              className="text-sm text-alert hover:underline"
            >
              Remover imagem
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
