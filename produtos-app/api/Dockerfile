# syntax=docker/dockerfile:1

# --- dependências completas (inclui devDependencies, para compilar) ----------
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- compilação -------------------------------------------------------------
FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- dependências de produção ----------------------------------------------
# Instalação separada para a imagem final não carregar TypeScript, vitest etc.
FROM node:24-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# --- imagem final -----------------------------------------------------------
FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# package.json vai junto por causa do "type": "module" — sem ele o Node trata
# os .js como CommonJS e a aplicação nem inicia.
COPY package.json ./

# Usuário sem privilégios, já existente na imagem oficial do Node.
USER node

EXPOSE 3333
CMD ["node", "dist/main.js"]
