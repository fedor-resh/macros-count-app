# syntax=docker/dockerfile:1
# Фронтенд: Vite собирает статику, Caddy её раздаёт.
# Собирается и под amd64, и под arm64 (Raspberry Pi 5) без изменений.

FROM node:20-alpine AS build
WORKDIR /app

# Сборка Rollup на Pi с 4 GB упирается в дефолтный heap Node.
ENV NODE_OPTIONS=--max-old-space-size=2048

COPY package.json package-lock.json ./
# Кэш npm переживает пересборки: на Pi это экономит минуты на каждом деплое.
RUN --mount=type=cache,target=/root/.npm \
	npm ci --legacy-peer-deps --no-audit --no-fund

COPY . .

# Vite подставляет эти значения в бандл на этапе сборки, рантайм их не читает.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_URL=/api/v1
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
	VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
	VITE_API_URL=$VITE_API_URL

RUN npm run build

# Раздаёт статику Caddy, а не `serve` на Node: ~10 МБ RSS вместо ~80 МБ
# и правильные заголовки кэша для PWA.
FROM caddy:2-alpine
COPY frontend.Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
EXPOSE 8081
