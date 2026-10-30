package llm

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestChatSendsRequestAndReturnsContent(t *testing.T) {
	var got request
	var auth string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auth = r.Header.Get("Authorization")
		if r.URL.Path != "/v1/chat/completions" {
			t.Errorf("path %s", r.URL.Path)
		}
		json.NewDecoder(r.Body).Decode(&got)
		w.Write([]byte(`{"choices":[{"message":{"role":"assistant","content":"{\"ok\":true}"}}]}`))
	}))
	defer srv.Close()
	out, err := New(srv.URL+"/v1/", "k3y").Chat(context.Background(), "m1", "sys", "usr")
	if err != nil || out != `{"ok":true}` {
		t.Fatalf("%q %v", out, err)
	}
	if auth != "Bearer k3y" || got.Model != "m1" || len(got.Messages) != 2 || got.Messages[0].Content != "sys" || got.Temperature != 0 {
		t.Fatalf("bad request: auth=%q %+v", auth, got)
	}
}

func TestChatErrors(t *testing.T) {
	cases := map[string]struct {
		status int
		body   string
		want   string
	}{
		"http error":  {500, `{"error":{"message":"model not loaded"}}`, "model not loaded"},
		"no choices":  {200, `{"choices":[]}`, "no choices"},
		"not json":    {200, `<html>`, "not JSON"},
		"plain error": {502, strings.Repeat("x", 1000), "502"},
	}
	for name, c := range cases {
		t.Run(name, func(t *testing.T) {
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(c.status)
				w.Write([]byte(c.body))
			}))
			defer srv.Close()
			_, err := New(srv.URL, "secret").Chat(context.Background(), "m", "s", "u")
			if err == nil || !strings.Contains(err.Error(), c.want) {
				t.Fatalf("want %q, got %v", c.want, err)
			}
			if strings.Contains(err.Error(), "secret") || len(err.Error()) > 400 {
				t.Fatalf("error leaks or is unbounded: %v", err)
			}
		})
	}
}

func TestChatHonorsCancellation(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { <-r.Context().Done() }))
	defer srv.Close()
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, err := New(srv.URL, "").Chat(ctx, "m", "s", "u"); err == nil {
		t.Fatal("expected error")
	}
}
