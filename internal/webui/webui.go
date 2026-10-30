// Package webui embeds the browser UI and serves it.
package webui

import (
	"crypto/sha256"
	"embed"
	"encoding/hex"
	"io/fs"
	"mime"
	"net/http"
	"path"
	"strings"
)

//go:embed all:static
var assets embed.FS

type file struct {
	data []byte
	etag string
	ctyp string
}

// Handler serves the UI files. Everything is embedded, so each file gets a content-hash ETag and
// clients revalidate cheaply. "/" serves index.html; routing inside the app uses the URL hash, so
// there is no fallback: an unknown path is a real 404.
func Handler() http.Handler {
	files := map[string]file{}
	root, _ := fs.Sub(assets, "static")
	fs.WalkDir(root, ".", func(p string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() {
			return nil
		}
		b, _ := fs.ReadFile(root, p)
		sum := sha256.Sum256(b)
		ctyp := mime.TypeByExtension(path.Ext(p))
		switch path.Ext(p) {
		case ".js", ".mjs":
			ctyp = "text/javascript; charset=utf-8"
		case ".css":
			ctyp = "text/css; charset=utf-8"
		case ".svg":
			ctyp = "image/svg+xml"
		}
		files[p] = file{b, `"` + hex.EncodeToString(sum[:8]) + `"`, ctyp}
		return nil
	})
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			w.Header().Set("Allow", "GET, HEAD")
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		name := strings.TrimPrefix(path.Clean("/"+r.URL.Path), "/")
		if name == "" {
			name = "index.html"
		}
		f, ok := files[name]
		if !ok {
			http.NotFound(w, r)
			return
		}
		h := w.Header()
		h.Set("Content-Type", f.ctyp)
		h.Set("ETag", f.etag)
		h.Set("Cache-Control", "no-cache")
		if r.Header.Get("If-None-Match") == f.etag {
			w.WriteHeader(http.StatusNotModified)
			return
		}
		if r.Method == http.MethodGet {
			w.Write(f.data)
		}
	})
}
