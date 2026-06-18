package handler

import (
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"
)

// Static serves a Next.js static export directory with SPA fallback to index.html.
func Static(root string) http.Handler {
	root = filepath.Clean(root)
	indexPath := filepath.Join(root, "index.html")

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		filePath, ok := resolveStaticFile(root, r.URL.Path)
		if !ok {
			http.NotFound(w, r)
			return
		}

		if _, err := os.Stat(filePath); err != nil {
			filePath = indexPath
		}

		http.ServeFile(w, r, filePath)
	})
}

func resolveStaticFile(root, urlPath string) (string, bool) {
	clean := path.Clean(urlPath)
	if clean == "." || clean == "/" {
		return filepath.Join(root, "index.html"), true
	}

	rel := strings.TrimPrefix(clean, "/")
	candidates := []string{
		filepath.Join(root, rel),
		filepath.Join(root, rel+".html"),
		filepath.Join(root, rel, "index.html"),
	}

	for _, candidate := range candidates {
		info, err := os.Stat(candidate)
		if err != nil {
			continue
		}
		if info.IsDir() {
			continue
		}
		if !strings.HasPrefix(filepath.Clean(candidate), root) {
			return "", false
		}
		return candidate, true
	}

	return filepath.Join(root, "index.html"), true
}
