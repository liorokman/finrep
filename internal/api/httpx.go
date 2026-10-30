package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"mime"
	"net/http"
	"strconv"
	"strings"

	"github.com/liorokman/finrep/internal/categorize"
	"github.com/liorokman/finrep/internal/jsonx"
	"github.com/liorokman/finrep/internal/ledger"
)

const maxJSONBody = 1 << 20

// apiError is an error with a status and a message that is safe to show to the client.
type apiError struct {
	status int
	msg    string
}

func (e *apiError) Error() string { return e.msg }

func bad(format string, a ...any) error {
	return &apiError{http.StatusBadRequest, fmt.Sprintf(format, a...)}
}

func conflict(format string, a ...any) error {
	return &apiError{http.StatusConflict, fmt.Sprintf(format, a...)}
}

// fail writes the right response for an error. Anything unexpected is logged with the request id and
// reported as a generic 500, so internals never reach the client.
func fail(w http.ResponseWriter, r *http.Request, err error) {
	var ae *apiError
	var mbe *http.MaxBytesError
	switch {
	case errors.As(err, &ae):
		writeError(w, ae.status, ae.msg)
	case errors.As(err, &mbe):
		writeError(w, http.StatusRequestEntityTooLarge, "request body is too large")
	case errors.Is(err, ledger.ErrNotFound), errors.Is(err, categorize.ErrNotFound):
		writeError(w, http.StatusNotFound, "not found")
	case errors.Is(err, ledger.ErrInvalid):
		writeError(w, http.StatusBadRequest, cleanMsg(err))
	case errors.Is(err, ledger.ErrDuplicate):
		writeError(w, http.StatusConflict, "already exists")
	case errors.Is(err, ledger.ErrInUse):
		writeError(w, http.StatusConflict, "it is still in use")
	case errors.Is(err, categorize.ErrBusy):
		writeError(w, http.StatusConflict, err.Error())
	case errors.Is(err, categorize.ErrNothingToDo):
		writeError(w, http.StatusConflict, err.Error())
	default:
		slog.Error("request failed", "request_id", w.Header().Get("X-Request-Id"), "method", r.Method, "path", r.URL.Path, "error", err)
		writeError(w, http.StatusInternalServerError, "internal error")
	}
}

// cleanMsg strips the sentinel prefix ("invalid: ") that wrapped validation errors carry.
func cleanMsg(err error) string {
	msg := err.Error()
	for _, p := range []string{ledger.ErrInvalid.Error() + ": ", ledger.ErrInvalid.Error()} {
		msg = strings.TrimPrefix(msg, p)
	}
	return strings.ReplaceAll(msg, ": "+ledger.ErrInvalid.Error()+": ", ": ")
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]any{"error": msg})
}

// writeJSON sends v with its field names converted to snake_case.
func writeJSON(w http.ResponseWriter, status int, v any) {
	raw, err := jsonx.Marshal(v)
	if err != nil {
		slog.Error("encode response", "error", err)
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal error"}`))
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	w.Write(raw)
	w.Write([]byte("\n"))
}

// readJSON decodes exactly one JSON object from a request, rejecting other content types, unknown
// fields, trailing data and oversized bodies.
func readJSON(w http.ResponseWriter, r *http.Request, dst any) error {
	mt, _, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
	if err != nil || mt != "application/json" {
		return &apiError{http.StatusUnsupportedMediaType, "Content-Type must be application/json"}
	}
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxJSONBody))
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		var mbe *http.MaxBytesError
		if errors.As(err, &mbe) {
			return err
		}
		if errors.Is(err, io.EOF) {
			return bad("request body is empty")
		}
		return bad("invalid JSON: %v", err)
	}
	if dec.More() {
		return bad("invalid JSON: unexpected data after the object")
	}
	return nil
}

// ---- query helpers ----

func intParam(r *http.Request, name string, def, lo, hi int) (int, error) {
	v := r.URL.Query().Get(name)
	if v == "" {
		return def, nil
	}
	n, err := strconv.Atoi(v)
	if err != nil || n < lo || n > hi {
		return 0, bad("%s must be a whole number between %d and %d", name, lo, hi)
	}
	return n, nil
}

func boolParam(r *http.Request, name string) (bool, error) {
	switch r.URL.Query().Get(name) {
	case "":
		return false, nil
	case "true", "1":
		return true, nil
	case "false", "0":
		return false, nil
	}
	return false, bad("%s must be true or false", name)
}

// list guarantees a JSON array (never null) for an empty result.
func list[T any](xs []T) []T {
	if xs == nil {
		return []T{}
	}
	return xs
}

// decodeStrict decodes a JSON string field (e.g. from a multipart form) with the same strictness as readJSON.
func decodeStrict(raw string, dst any) error {
	dec := json.NewDecoder(strings.NewReader(raw))
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		return err
	}
	if dec.More() {
		return errors.New("unexpected data after the object")
	}
	return nil
}
