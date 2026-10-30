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

func TestChooseSendsTheQuestionAndReturnsTheChosenProbability(t *testing.T) {
	var got map[string]any
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/systemone" || r.Header.Get("Authorization") != "Bearer k" {
			t.Errorf("path %s auth %q", r.URL.Path, r.Header.Get("Authorization"))
		}
		json.NewDecoder(r.Body).Decode(&got)
		w.Write([]byte(`{"answers":{"choice":{"type":"choice","choice":"c1","probabilities":{"c0":0.1,"c1":0.83},"confidence":0.6}}}`))
	}))
	defer srv.Close()
	key, p, err := New(srv.URL+"/v1", "k").Choose(context.Background(), "m", "שופרסל", "which?", map[string]string{"c0": "A", "c1": "B"})
	if err != nil || key != "c1" || p != 0.83 {
		t.Fatalf("%q %v %v", key, p, err)
	}
	q := got["questions"].(map[string]any)["choice"].(map[string]any)
	if got["model"] != "m" || got["state"] != "שופרסל" || q["type"] != "choice" || q["instructions"] != "which?" || len(q["criteria"].(map[string]any)) != 2 {
		t.Fatalf("request: %v", got)
	}
}

func TestChooseFailures(t *testing.T) {
	reply := func(status int, body string) *httptest.Server {
		return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(status); w.Write([]byte(body)) }))
	}
	crit := map[string]string{"a": "A", "b": "B"}
	for name, c := range map[string]struct {
		status int
		body   string
		want   string
	}{
		"not a decision model": {400, `{"error":{"message":"model does not declare the decisions usecase"}}`, "decisions usecase"},
		"unknown option":       {200, `{"answers":{"choice":{"choice":"zzz","probabilities":{"zzz":1}}}}`, "not an option"},
		"no answer":            {200, `{"answers":{}}`, "no answer"},
		"garbage":              {200, `<html>`, "not JSON"},
	} {
		t.Run(name, func(t *testing.T) {
			srv := reply(c.status, c.body)
			defer srv.Close()
			if _, _, err := New(srv.URL, "").Choose(context.Background(), "m", "x", "q", crit); err == nil || !strings.Contains(err.Error(), c.want) {
				t.Fatalf("want %q, got %v", c.want, err)
			}
		})
	}
	if _, _, err := New("http://127.0.0.1:1", "").Choose(context.Background(), "m", "  ", "q", crit); err == nil {
		t.Fatal("blank state accepted")
	}
	// A model that reports only a confidence still works.
	srv := reply(200, `{"answers":{"choice":{"choice":"a","confidence":0.7}}}`)
	defer srv.Close()
	if k, p, err := New(srv.URL, "").Choose(context.Background(), "m", "x", "q", crit); err != nil || k != "a" || p != 0.7 {
		t.Fatalf("%q %v %v", k, p, err)
	}
}
