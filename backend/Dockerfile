# syntax=docker/dockerfile:1
# Go API. Собирается под архитектуру хоста, включая arm64 (Raspberry Pi 5).

FROM golang:1.25-alpine AS build
WORKDIR /app

COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
	go mod download

COPY . .
# Кэши модулей и компилятора переживают пересборки — на Pi это основная экономия.
RUN --mount=type=cache,target=/go/pkg/mod \
	--mount=type=cache,target=/root/.cache/go-build \
	CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server \
	&& CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/migrate-images ./cmd/migrate-images

FROM alpine:3.20
# tzdata нужен для локальных дат приёмов пищи, ca-certificates — для OpenRouter и JWKS.
RUN apk add --no-cache ca-certificates tzdata \
	&& adduser -D -u 10001 app \
	&& mkdir -p /data \
	&& chown app:app /data
COPY --from=build /out/server /usr/local/bin/server
COPY --from=build /out/migrate-images /usr/local/bin/migrate-images
# Картинки пишутся в volume на /data, права на него наследуются от этого каталога.
USER app
EXPOSE 8080
ENTRYPOINT ["server"]
