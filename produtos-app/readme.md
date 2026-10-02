# produtos-app

CRUD de produtos com NestJS + Next.js + PostgreSQL. Projeto de estudo.

## Subir tudo com Docker

```bash
cp .env.example .env        # ajuste a senha
docker compose up --build   # db + api + web
```

Front em <http://localhost:3000>, API em <http://localhost:3333>.
A API só inicia depois que o banco fica saudável, e o front só depois que a API
fica saudável — o encadeamento é por `healthcheck`, não por `sleep`.
As migrations rodam no boot da API, então o banco vazio já sobe com a tabela.

## Desenvolver fora do Docker

Sobe só o banco e roda as duas aplicações na máquina:

```bash
docker compose up -d db

cd api && npm run start:dev     # http://localhost:3333
cd web && npm run dev           # http://localhost:3000
```

## Portas

| Serviço | Porta | Definida em |
|---------|-------|-------------|
| `web` (Next.js) | 3000 | `WEB_PORT` no `.env` / default do `next dev` |
| `api` (NestJS)  | 3333 | `API_PORT` no `.env`, `PORT` na aplicação |
| `db` (Postgres 17) | 5434 | `DB_PORT` no `.env` |

A porta do banco não é a 5432 porque essa costuma estar ocupada por outros
projetos na máquina. Dentro da rede do Docker o Postgres continua na 5432, e é
por isso que o serviço `api` usa `DB_HOST=db` e `DB_PORT=5432` no compose.

A API escuta em `0.0.0.0` (e não só em `localhost`) para que a porta publicada
responda de fora do container. O `server.js` do Next precisa do mesmo, via
`HOSTNAME=0.0.0.0`.

## API

| Método | Rota | O que faz |
|--------|------|-----------|
| `GET` | `/health` | Verifica a conexão com o banco (usado no healthcheck) |
| `GET` | `/produtos?limit=20&cursor=<id>` | Lista paginada por keyset |
| `GET` | `/produtos/:id` | Busca por id (404 se não existir) |
| `POST` | `/produtos` | Cria |
| `PATCH` | `/produtos/:id` | Atualiza parcialmente |
| `DELETE` | `/produtos/:id` | Remove (204) |

A listagem devolve `{ dados, proximoCursor }`. O cursor é o `id` do último item:
a próxima página filtra por `id > cursor`, em vez de `OFFSET`. Assim a página
1000 custa o mesmo que a primeira.

Dinheiro é `numeric(10,2)` no banco e **string** na aplicação — o driver `pg`
devolve `numeric` como string justamente para não perder precisão em float.

## Banco e migrations

```bash
docker compose up -d db                              # sobe só o banco
docker compose exec db psql -U produtos -d produtos  # abre o psql
docker compose down                                  # para (dados ficam no volume)
docker compose down -v                               # para e APAGA os dados

cd api
npm run migration:show      # o que já rodou
npm run migration:run       # aplica pendentes
npm run migration:revert    # desfaz a última
```

`synchronize` é `false`: o schema muda só por migration. Ao criar uma migration
nova, **importe-a em `api/src/database/migrations/index.ts`** — a lista é
explícita porque o carregamento por glob do TypeORM é frágil em ESM.

## Testes

```bash
cd api && npm run test:e2e   # precisa do banco de pé
cd web && npm run build      # checa tipos e compila
```

## Variáveis de ambiente

`.env` na raiz (fora do git) alimenta o compose e a API; `web/.env.local`
alimenta o front. Os modelos versionados são `.env.example` e
`web/.env.example`. `API_URL` não tem o prefixo `NEXT_PUBLIC_` de propósito:
o front chama a API pelo servidor, e a URL nunca chega ao navegador.

## Detalhes conhecidos

- Uma página de produto inexistente (`/produtos/999/editar`) mostra o 404 do
  Next, mas com status HTTP 200: o `loading.tsx` faz o Next começar a enviar o
  HTML antes de a página resolver, e aí os headers já foram embora. O Next
  marca a resposta com `<meta name="robots" content="noindex">`.

## Pendências

### Imagens órfãs no S3

O upload vai do navegador direto para o bucket, então o objeto é gravado antes
de o produto existir no banco. Três situações deixam lixo no S3 — nenhuma
quebra a aplicação, todas aumentam a conta:

| Quando | O que sobra | Onde se resolve |
|--------|-------------|-----------------|
| Upload conclui e o produto não é salvo (erro de validação, aba fechada) | objeto sem nenhuma linha apontando para ele | lifecycle rule no bucket |
| ~~`DELETE /produtos/:id`~~ | — | ✅ feito: `remover()` apaga o objeto |
| ~~Imagem trocada no `PATCH`~~ | — | ✅ feito: `atualizar()` apaga a chave antiga |

O caso inverso (linha apontando para objeto inexistente) não acontece: o
produto só é salvo depois do PUT retornar 200.

Sobra o primeiro caso. Encaminhamento previsto, **sem código**: subir para o
prefixo `tmp/`, pôr uma lifecycle rule expirando `tmp/` em 1 dia, e fazer
`CopyObject` para `produtos/` quando o produto for salvo. A regra é
configuração do bucket (lado AWS).

### A ordem das operações, e por que o delete nunca reprova a requisição

O Postgres e o S3 não compartilham transação, então um dos dois vai falhar
sozinho em algum momento. A ordem escolhida decide de que lado a falha cai:

| Ordem | Se o segundo passo falhar |
|-------|---------------------------|
| S3 primeiro, banco depois | linha aponta para objeto que não existe → imagem quebrada na tela |
| **Banco primeiro, S3 depois** | objeto órfão no bucket → desperdício invisível |

Por isso `remover()` e `atualizar()` só chamam `imagens.apagar()` **depois** do
commit, e `apagar()` nunca lança: se o S3 estiver fora do ar, editar ou remover
um produto continua funcionando. A chave que não pôde ser apagada vai para o
log como `WARN`, para dar o que reconciliar.

### Job de reconciliação — não feito

Os órfãos registrados no log não têm quem os limpe hoje. O desenho previsto é
um job periódico que:

1. lista o prefixo `produtos/` (`ListObjectsV2`);
2. compara com `SELECT imagem_key FROM produtos WHERE imagem_key IS NOT NULL`;
3. apaga o que está no bucket e não está no banco.

Com um detalhe que não pode faltar: **ignorar objetos com menos de 24h**. Um
arquivo recém-enviado legitimamente ainda não está no banco, porque o usuário
pode estar preenchendo o formulário — sem esse filtro o job apaga upload em
andamento.

A alternativa robusta é o padrão *outbox*: gravar a intenção de apagar numa
tabela, na mesma transação do produto, e um worker retenta até conseguir. Fica
para quando houver worker no projeto por outro motivo. O `DELETE` do S3 é
idempotente (apagar chave inexistente devolve 204), então retentar é seguro nos
dois desenhos.

### Validação do upload é feita fora deste repositório

Os 5 MB são checados em JavaScript no `campo-de-imagem.tsx`, e a assinatura
prende o `Content-Type` **declarado**, não os bytes. Nenhum dos dois segura quem
usar a URL pré-assinada por fora do navegador.

Quem fecha isso é uma **função Lambda implantada na AWS**, disparada pelo evento
`s3:ObjectCreated` no prefixo `produtos/`: ela lê os primeiros bytes do objeto
(os *magic numbers* identificam o formato real, ao contrário da extensão e do
`Content-Type`), confere o tamanho e apaga o que não for imagem válida.

O código dessa função **não é versionado aqui** — vive no console da AWS. Vale
saber ao mexer no fluxo de upload, porque ela pode apagar um objeto depois de o
produto já estar salvo: é o único caminho em que sobra uma `imagem_key`
apontando para objeto inexistente, e só acontece com arquivo falsificado.

Alternativa que dispensaria a função, para o caso de tamanho: trocar o PUT
pré-assinado por `createPresignedPost`, que assina uma policy com
`content-length-range` e faz o S3 recusar sozinho — ao custo de o upload virar
`multipart/form-data`.

## Fases

1. API — CRUD, validação, keyset, `/health`, migrations ✅
2. Front — lista, criar, editar, remover ✅
3. Docker — Dockerfiles multi-stage não-root e compose com os três serviços ✅
4. Upload de imagem no S3 (só o código) ✅ — ver **Pendências** acima

Deploy na AWS, CI/CD, Kubernetes e observabilidade são exercício do
desenvolvedor, não estão neste repositório.
