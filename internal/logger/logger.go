package logger

import (
	"log/slog"
	"os"
	"strings"
)

var LevelVar = new(slog.LevelVar)

// InitLogger initializes global slog logger with dynamic level
func InitLogger(levelStr string) *slog.Logger {
	level := parseLevel(levelStr)
	LevelVar.Set(level)

	handlerOpts := &slog.HandlerOptions{
		Level: LevelVar,
	}

	handler := slog.NewJSONHandler(os.Stdout, handlerOpts)
	l := slog.New(handler)
	slog.SetDefault(l)
	return l
}

func parseLevel(s string) slog.Level {
	switch strings.ToLower(s) {
	case "debug":
		return slog.LevelDebug
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}
