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

## Fases

1. API — CRUD, validação, keyset, `/health`, migrations ✅
2. Front — lista, criar, editar, remover ✅
3. Docker — Dockerfiles multi-stage não-root e compose com os três serviços ✅
4. Upload de imagem no S3 (só o código) — pendente

Deploy na AWS, CI/CD, Kubernetes e observabilidade são exercício do
desenvolvedor, não estão neste repositório.
