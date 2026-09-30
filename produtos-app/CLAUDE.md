# produtos-app

Projeto de estudo: um CRUD de produtos com NestJS + Next.js + PostgreSQL, rodando com Docker Compose.
O objetivo é praticar a stack de uma vaga e, depois, **o próprio desenvolvedor** fazer o deploy na AWS para aprender.

Responda sempre em português.

## Divisão de responsabilidades

**Claude Code faz:** o código da aplicação (API, front), Dockerfiles, docker-compose e configuração local.

**O desenvolvedor faz sozinho (NÃO fazer por ele):**
- Criar ou alterar qualquer recurso na AWS (EC2, S3, IAM, security groups, ECR, RDS, CloudWatch).
- Rodar comandos da AWS CLI, configurar credenciais AWS ou acessar servidores via SSH.
- Pipelines de CI/CD (GitHub Actions), manifestos de Kubernetes, domínio e HTTPS.

Se o desenvolvedor pedir ajuda nessas partes, explique o conceito e o próximo passo, e deixe ele executar.
Não escreva scripts completos de deploy ou infraestrutura a menos que ele peça explicitamente.

## Modo de trabalho

- Uma fase por vez. Antes de começar, resuma em poucas linhas o que vai fazer.
- Explique brevemente decisões que não são óbvias (o "porquê", não só o "o quê").
- Ao terminar uma fase: liste o que foi feito, como rodar, o que testar, sugira uma mensagem de commit e **pare**.
- Nunca coloque segredos no código. Use `.env` (fora do git) e mantenha um `.env.example` atualizado.

## Estrutura

```
produtos-app/
  api/                 NestJS
  web/                 Next.js (App Router)
  docker-compose.yml
  CLAUDE.md
```

## Stack e decisões

### Banco (PostgreSQL 17)
- Tabela `produtos`: `id` (identity), `nome`, `descricao` (text, nullable), `preco` (numeric(10,2)),
  `estoque` (int, default 0), `imagem_key` (text, nullable), `criado_em` e `atualizado_em` (timestamptz).
- Dinheiro sempre em `numeric`, nunca float. O driver `pg` devolve numeric como string: manter `preco` como string na entidade.
- Datas sempre `timestamptz`.
- `imagem_key` guarda só a chave do objeto no S3, nunca a URL completa.
- Usar **migrations** do TypeORM (`synchronize: false`). O `synchronize: true` só foi usado no começo.

### API (NestJS)
- TypeORM + `pg` + `@nestjs/config`.
- `ValidationPipe` global com `whitelist`, `forbidNonWhitelisted` e `transform`; DTOs com `class-validator`.
- `preco` validado como decimal com até 2 casas.
- Endpoints REST em `/produtos`: listar, buscar por id, criar, atualizar (PATCH), remover.
- Listagem paginada por **keyset** (`?limit=20&cursor=<ultimo_id>`), não por OFFSET.
- `404` quando o produto não existe.
- `GET /health` verificando a conexão com o banco (será usado em healthchecks).
- Escutar em `0.0.0.0`, porta via env `PORT` (padrão 3333). CORS liberado para a origem do front via env.

### Front (Next.js, App Router, TypeScript, Tailwind)
- Páginas: `/produtos` (lista), `/produtos/novo`, `/produtos/[id]/editar`.
- Leitura de dados em **Server Components**, chamando a API pela env server-side `API_URL`.
- Formulários e botões interativos como **Client Components** pequenos (`'use client'` só nas folhas),
  ou Server Actions quando fizer sentido.
- `loading.tsx` nas rotas dinâmicas.
- `output: 'standalone'` no `next.config` para a imagem Docker ficar enxuta.

### Docker
- `docker-compose.yml` com `db`, `api` e `web`.
- `db` com volume nomeado e healthcheck (`pg_isready`); `api` com `depends_on` condicionado ao banco saudável.
- Dockerfiles **multi-stage** para `api` e `web`, rodando como usuário não-root.
- `.dockerignore` em cada app (node_modules, .env, dist, .next).
- Configuração só por variáveis de ambiente, para a mesma imagem rodar local e na AWS.

## Fases (Claude Code)

1. **API**: conexão com o banco, entidade, migration inicial, CRUD completo com validação, paginação keyset, `/health`.
2. **Front**: listagem, criação, edição e remoção consumindo a API.
3. **Docker**: Dockerfiles multi-stage e compose com os três serviços; tudo sobe com `docker compose up --build`.
4. **Upload de imagem (código apenas)**: endpoint que gera URL pré-assinada de PUT no S3
   (`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`), upload direto do navegador e exibição da imagem.
   - Nome do bucket e região via env (`S3_BUCKET`, `AWS_REGION`).
   - Credenciais pela cadeia padrão do SDK. **Nunca** chaves de acesso no código.
   - Se `S3_BUCKET` não estiver definido, a funcionalidade de imagem fica desabilitada sem quebrar o resto.
   - O bucket, a policy e o usuário/role do IAM serão criados pelo desenvolvedor.

## Fora do escopo do Claude Code (o desenvolvedor fará)

Deploy numa EC2 com Docker Compose, security groups, envio de imagens ao ECR, CI/CD com GitHub Actions,
Kubernetes local (kind/minikube), RDS, CloudWatch e observabilidade com OpenTelemetry.

## Estado atual

Já existe o `docker-compose.yml` com o serviço `db` e o projeto Nest em `api/` com TypeORM configurado
e o resource `produtos` gerado (`nest g resource`), ainda com o service de exemplo e `synchronize: true`.
Confira o estado real dos arquivos antes de começar a Fase 1.
