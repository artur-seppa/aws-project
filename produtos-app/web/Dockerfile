# syntax=docker/dockerfile:1

# --- dependências -----------------------------------------------------------
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- build ------------------------------------------------------------------
FROM node:24-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- imagem final -----------------------------------------------------------
FROM node:24-alpine AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# O server.js do standalone lê estas duas: sem HOSTNAME ele escuta só no
# loopback do container e a porta publicada não responde.
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app

# output: "standalone" já traz o node_modules mínimo dentro de .next/standalone;
# static e public ficam de fora e precisam ser copiados à mão.
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public

USER node

EXPOSE 3000
CMD ["node", "server.js"]
