// Package settings stores the few options that are changed from the UI. Only keys in the allow-list
// can be written, values are validated, and secrets can be written but never read back.
package settings

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/url"
	"sort"
	"strconv"
	"strings"

	"github.com/liorokman/finrep/internal/ledger"
	"github.com/liorokman/finrep/internal/store"
)

// Keys.
const (
	LLMBaseURL      = "llm_base_url"
	LLMAPIKey       = "llm_api_key"
	ClassifierModel = "classifier_model"
	ClassifierAPI   = "classifier_api" // "chat" (default) or "decision" (LocalAI /v1/systemone)
	GeneratorModel  = "generator_model"
	Threshold       = "categorization_threshold"
	BatchSize       = "categorization_batch_size"
	CardHints       = "card_payment_hints" // read by internal/billing
)

type def struct {
	secret   bool
	label    string
	validate func(string) (string, error)
}

func invalid(format string, a ...any) error {
	return fmt.Errorf("%w: %s", ledger.ErrInvalid, fmt.Sprintf(format, a...))
}

func text(max int) func(string) (string, error) {
	return func(v string) (string, error) {
		v = strings.TrimSpace(v)
		if len(v) > max {
			return "", invalid("value is longer than %d characters", max)
		}
		return v, nil
	}
}

func httpURL(v string) (string, error) {
	v = strings.TrimRight(strings.TrimSpace(v), "/")
	u, err := url.Parse(v)
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" || u.User != nil || u.RawQuery != "" || u.Fragment != "" {
		return "", invalid("must be an http(s) URL without credentials, query or fragment")
	}
	return v, nil
}

func oneOf(opts ...string) func(string) (string, error) {
	return func(v string) (string, error) {
		v = strings.TrimSpace(v)
		for _, o := range opts {
			if v == o {
				return v, nil
			}
		}
		return "", invalid("must be one of: %s", strings.Join(opts, ", "))
	}
}

func floatRange(lo, hi float64) func(string) (string, error) {
	return func(v string) (string, error) {
		f, err := strconv.ParseFloat(strings.TrimSpace(v), 64)
		if err != nil || f < lo || f > hi {
			return "", invalid("must be a number between %g and %g", lo, hi)
		}
		return strconv.FormatFloat(f, 'f', -1, 64), nil
	}
}

func intRange(lo, hi int) func(string) (string, error) {
	return func(v string) (string, error) {
		n, err := strconv.Atoi(strings.TrimSpace(v))
		if err != nil || n < lo || n > hi {
			return "", invalid("must be a whole number between %d and %d", lo, hi)
		}
		return strconv.Itoa(n), nil
	}
}

var defs = map[string]def{
	LLMBaseURL:      {label: "LLM endpoint (OpenAI-compatible base URL)", validate: httpURL},
	LLMAPIKey:       {label: "LLM API key", secret: true, validate: text(500)},
	ClassifierAPI:   {label: "How the decision model is called", validate: oneOf("chat", "decision")},
	ClassifierModel: {label: "Decision (classifier) model", validate: text(200)},
	GeneratorModel:  {label: "Generator model", validate: text(200)},
	Threshold:       {label: "Confidence needed to use an existing category", validate: floatRange(0.5, 1)},
	BatchSize:       {label: "Distinct payees per request", validate: intRange(1, 50)},
	CardHints:       {label: "Words that mark a bank line as a card payment (one per line)", validate: text(2000)},
}

// Store reads and writes settings.
type Store struct{ st *store.Store }

func New(st *store.Store) *Store { return &Store{st: st} }

// Item is one setting as shown to a client. A secret's value is never included.
type Item struct {
	Key    string
	Label  string
	Secret bool
	IsSet  bool
	Value  string // empty for secrets
}

// List returns every allowed setting in key order.
func (s *Store) List(ctx context.Context) ([]Item, error) {
	rows, err := s.st.QueryContext(ctx, `SELECT key, value FROM settings`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	have := map[string]string{}
	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err != nil {
			return nil, err
		}
		have[k] = v
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	var out []Item
	for k, d := range defs {
		v, ok := have[k]
		it := Item{Key: k, Label: d.label, Secret: d.secret, IsSet: ok && v != ""}
		if !d.secret {
			it.Value = v
		}
		out = append(out, it)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Key < out[j].Key })
	return out, nil
}

// Update applies changes atomically. A key mapped to "" is cleared; keys not mentioned are untouched
// (so a client that cannot read a secret does not wipe it). Unknown keys and bad values are rejected
// and nothing is written.
func (s *Store) Update(ctx context.Context, changes map[string]string) error {
	clean := make(map[string]string, len(changes))
	for k, v := range changes {
		d, ok := defs[k]
		if !ok {
			return invalid("unknown setting %q", k)
		}
		if strings.TrimSpace(v) == "" {
			clean[k] = ""
			continue
		}
		cv, err := d.validate(v)
		if err != nil {
			return fmt.Errorf("%s: %w", k, err)
		}
		clean[k] = cv
	}
	return s.st.WithTx(ctx, func(tx *sql.Tx) error {
		for k, v := range clean {
			if v == "" {
				if _, err := tx.ExecContext(ctx, `DELETE FROM settings WHERE key = ?`, k); err != nil {
					return err
				}
				continue
			}
			if _, err := tx.ExecContext(ctx, `INSERT INTO settings (key, value) VALUES (?, ?)
				ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`, k, v); err != nil {
				return err
			}
		}
		return nil
	})
}

// Get returns a stored value, secrets included; for server-side use only.
func (s *Store) Get(ctx context.Context, key string) (string, bool, error) {
	var v string
	err := s.st.QueryRowContext(ctx, `SELECT value FROM settings WHERE key = ?`, key).Scan(&v)
	if errors.Is(err, sql.ErrNoRows) {
		return "", false, nil
	}
	return v, err == nil, err
}

// LLM is the model configuration for categorization.
type LLM struct {
	BaseURL, APIKey, Classifier, Generator string
	ClassifierAPI                          string // "chat" or "decision"
	Threshold                              float64
	BatchSize                              int
}

// Configured reports whether categorization can run.
func (l LLM) Configured() bool { return l.BaseURL != "" && l.Classifier != "" && l.Generator != "" }

// LLM loads the model settings, applying defaults for the optional ones.
func (s *Store) LLM(ctx context.Context) (LLM, error) {
	l := LLM{Threshold: 0.75, BatchSize: 20, ClassifierAPI: "chat"}
	for key, dst := range map[string]*string{LLMBaseURL: &l.BaseURL, LLMAPIKey: &l.APIKey, ClassifierModel: &l.Classifier, GeneratorModel: &l.Generator} {
		v, _, err := s.Get(ctx, key)
		if err != nil {
			return l, err
		}
		*dst = v
	}
	if v, ok, err := s.Get(ctx, ClassifierAPI); err != nil {
		return l, err
	} else if ok && v != "" {
		l.ClassifierAPI = v
	}
	if v, ok, err := s.Get(ctx, Threshold); err != nil {
		return l, err
	} else if ok {
		l.Threshold, _ = strconv.ParseFloat(v, 64)
	}
	if v, ok, err := s.Get(ctx, BatchSize); err != nil {
		return l, err
	} else if ok {
		l.BatchSize, _ = strconv.Atoi(v)
	}
	return l, nil
}
