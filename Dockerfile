# Stage 1: Build Vite Frontend Assets
FROM node:20-alpine AS ui-builder
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# Stage 2: Build Go 1.26 CGO-free Executable
FROM golang:1.26-alpine AS go-builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=ui-builder /app/cmd/server/public ./cmd/server/public
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o finrep ./cmd/server

# Stage 3: Minimal Production Runtime
FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=go-builder /app/finrep /app/finrep

EXPOSE 8080
VOLUME ["/app/data"]

ENTRYPOINT ["/app/finrep"]
CMD ["--port=8080", "--db-path=/app/data/finrep.db"]
