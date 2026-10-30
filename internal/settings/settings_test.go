package settings

import (
	"context"
	"errors"
	"path/filepath"
	"strings"
	"testing"

	"github.com/liorokman/finrep/internal/ledger"
	"github.com/liorokman/finrep/internal/store"
)

var ctx = context.Background()

func newStore(t *testing.T) *Store {
	t.Helper()
	st, err := store.Open(ctx, filepath.Join(t.TempDir(), "t.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { st.Close() })
	return New(st)
}

func item(t *testing.T, s *Store, key string) Item {
	t.Helper()
	items, err := s.List(ctx)
	if err != nil {
		t.Fatal(err)
	}
	for _, it := range items {
		if it.Key == key {
			return it
		}
	}
	t.Fatalf("no item %s", key)
	return Item{}
}

func TestSecretsAreWriteOnly(t *testing.T) {
	s := newStore(t)
	if err := s.Update(ctx, map[string]string{LLMAPIKey: "sk-very-secret", ClassifierModel: "small"}); err != nil {
		t.Fatal(err)
	}
	k := item(t, s, LLMAPIKey)
	if !k.IsSet || !k.Secret || k.Value != "" {
		t.Fatalf("secret leaked or not reported: %+v", k)
	}
	items, _ := s.List(ctx)
	for _, it := range items {
		if strings.Contains(it.Value, "sk-very-secret") || strings.Contains(it.Label, "sk-very") {
			t.Fatalf("leak in %+v", it)
		}
	}
	if m := item(t, s, ClassifierModel); m.Value != "small" || !m.IsSet {
		t.Fatalf("%+v", m)
	}
	// Server-side code can still read it.
	if l, err := s.LLM(ctx); err != nil || l.APIKey != "sk-very-secret" || l.Classifier != "small" {
		t.Fatalf("%+v %v", l, err)
	}
	// Not mentioning a secret leaves it alone; an empty value clears it.
	if err := s.Update(ctx, map[string]string{GeneratorModel: "big"}); err != nil {
		t.Fatal(err)
	}
	if !item(t, s, LLMAPIKey).IsSet {
		t.Fatal("untouched secret was wiped")
	}
	if err := s.Update(ctx, map[string]string{LLMAPIKey: " "}); err != nil {
		t.Fatal(err)
	}
	if item(t, s, LLMAPIKey).IsSet {
		t.Fatal("clear did not work")
	}
}

func TestValidationAndAtomicity(t *testing.T) {
	s := newStore(t)
	bad := []map[string]string{
		{"admin_password": "x"},
		{"schema_migrations": "x"},
		{LLMBaseURL: "ftp://x"},
		{LLMBaseURL: "http://user:pw@host/v1"},
		{LLMBaseURL: "http://host/v1?key=1"},
		{LLMBaseURL: "not a url"},
		{Threshold: "0.2"},
		{Threshold: "abc"},
		{BatchSize: "0"},
		{BatchSize: "51"},
		{ClassifierModel: strings.Repeat("x", 201)},
	}
	for _, c := range bad {
		if err := s.Update(ctx, c); !errors.Is(err, ledger.ErrInvalid) {
			t.Errorf("%v: want ErrInvalid, got %v", c, err)
		}
	}
	// One bad value in a batch rejects the whole batch.
	err := s.Update(ctx, map[string]string{GeneratorModel: "ok", Threshold: "9"})
	if !errors.Is(err, ledger.ErrInvalid) {
		t.Fatal(err)
	}
	if item(t, s, GeneratorModel).IsSet {
		t.Fatal("partial write")
	}
}

func TestLLMDefaultsAndNormalization(t *testing.T) {
	s := newStore(t)
	l, err := s.LLM(ctx)
	if err != nil || l.Configured() || l.Threshold != 0.75 || l.BatchSize != 20 {
		t.Fatalf("%+v %v", l, err)
	}
	if err := s.Update(ctx, map[string]string{LLMBaseURL: " http://localai:8080/v1/ ", ClassifierModel: "a", GeneratorModel: "b", Threshold: "0.80", BatchSize: " 10 "}); err != nil {
		t.Fatal(err)
	}
	l, _ = s.LLM(ctx)
	if !l.Configured() || l.BaseURL != "http://localai:8080/v1" || l.Threshold != 0.8 || l.BatchSize != 10 {
		t.Fatalf("%+v", l)
	}
	// The card-payment hints share their key with the billing service.
	if err := s.Update(ctx, map[string]string{CardHints: "כרטיסי אשראי\nישראכרט"}); err != nil {
		t.Fatal(err)
	}
}

func TestClassifierAPISetting(t *testing.T) {
	s := newStore(t)
	if l, _ := s.LLM(ctx); l.ClassifierAPI != "chat" {
		t.Fatalf("default %q", l.ClassifierAPI)
	}
	if err := s.Update(ctx, map[string]string{ClassifierAPI: "decision"}); err != nil {
		t.Fatal(err)
	}
	if l, _ := s.LLM(ctx); l.ClassifierAPI != "decision" {
		t.Fatalf("%q", l.ClassifierAPI)
	}
	for _, bad := range []string{"gpt", "Decision ", "systemone"} {
		if err := s.Update(ctx, map[string]string{ClassifierAPI: bad}); !errors.Is(err, ledger.ErrInvalid) {
			t.Errorf("%q: %v", bad, err)
		}
	}
}
