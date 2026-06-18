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

		filePath, _ := resolveStaticFile(root, r.URL.Path, indexPath)

		if _, err := os.Stat(filePath); err != nil {
			if os.IsNotExist(err) {
				http.NotFound(w, r)
				return
			}
			http.Error(w, "internal server error", http.StatusInternalServerError)
			return
		}

		http.ServeFile(w, r, filePath)
	})
}

// resolveStaticFile returns the file to serve and whether it matched an explicit
// asset (true) or is the SPA index.html fallback (false).
func resolveStaticFile(root, urlPath, indexPath string) (string, bool) {
	clean := path.Clean(urlPath)
	if clean == "." || clean == "/" {
		return indexPath, false
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
			continue
		}
		return candidate, true
	}

	if boardShell := boardSPAFallback(root, clean); boardShell != "" {
		return boardShell, false
	}

	return indexPath, false
}

func boardSPAFallback(root, urlPath string) string {
	parts := strings.Split(strings.Trim(urlPath, "/"), "/")
	if len(parts) != 2 || parts[0] != "boards" {
		return ""
	}

	for _, rel := range []string{
		filepath.Join("boards", "demo", "index.html"),
		filepath.Join("boards", "index.html"),
	} {
		candidate := filepath.Join(root, rel)
		if _, err := os.Stat(candidate); err == nil {
			return candidate
		}
	}
	return ""
}
