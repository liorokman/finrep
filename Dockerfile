# Build: the UI is plain files embedded in the binary, so there is no Node stage.
FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/finrep ./cmd/finrep

# Run: minimal image, non-root, data in a volume.
FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata \
 && addgroup -S -g 10001 finrep && adduser -S -u 10001 -G finrep -h /data finrep \
 && mkdir -p /data && chown finrep:finrep /data
COPY --from=build /out/finrep /usr/local/bin/finrep
USER finrep
WORKDIR /data
ENV FINREP_DB_PATH=/data/finrep.db FINREP_PORT=8080
EXPOSE 8080
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null || exit 1
ENTRYPOINT ["finrep"]
