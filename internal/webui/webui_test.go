package webui

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func get(h http.Handler, method, path string, hdr map[string]string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, nil)
	for k, v := range hdr {
		req.Header.Set(k, v)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func TestServesIndexAndRevalidates(t *testing.T) {
	h := Handler()
	rec := get(h, "GET", "/", nil)
	if rec.Code != 200 || !strings.Contains(rec.Body.String(), `<div id="app">`) || !strings.HasPrefix(rec.Header().Get("Content-Type"), "text/html") {
		t.Fatalf("%d %s", rec.Code, rec.Header().Get("Content-Type"))
	}
	etag := rec.Header().Get("ETag")
	if etag == "" || rec.Header().Get("Cache-Control") != "no-cache" {
		t.Fatalf("etag %q cache %q", etag, rec.Header().Get("Cache-Control"))
	}
	if rec := get(h, "GET", "/index.html", map[string]string{"If-None-Match": etag}); rec.Code != http.StatusNotModified || rec.Body.Len() != 0 {
		t.Fatalf("revalidation: %d", rec.Code)
	}
	if rec := get(h, "HEAD", "/", nil); rec.Code != 200 || rec.Body.Len() != 0 {
		t.Fatalf("HEAD: %d %d", rec.Code, rec.Body.Len())
	}
}

func TestStaticTypesAndPathSafety(t *testing.T) {
	h := Handler()
	if rec := get(h, "GET", "/js/boot.js", nil); rec.Code != 200 || !strings.HasPrefix(rec.Header().Get("Content-Type"), "text/javascript") {
		t.Fatalf("js: %d %s", rec.Code, rec.Header().Get("Content-Type"))
	}
	for _, p := range []string{"/nope", "/js/nope.js", "/../../go.mod", "/%2e%2e/go.mod", "/static/index.html", "//etc/passwd", "/js/"} {
		if rec := get(h, "GET", p, nil); rec.Code != 404 {
			t.Errorf("%s: %d", p, rec.Code)
		}
	}
	if rec := get(h, "POST", "/", nil); rec.Code != http.StatusMethodNotAllowed || rec.Header().Get("Allow") == "" {
		t.Errorf("POST: %d", rec.Code)
	}
}
