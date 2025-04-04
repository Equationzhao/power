package main

import (
	"log/slog"
	"os"

	"github.com/valyala/fasthttp"
)

func main() {
	slog.Info("Server starting on :8080")
	slog.Info("Visit http://localhost:8080/ in your browser")
	if err := fasthttp.ListenAndServe(":8080", mainHandler); err != nil {
		slog.Error("Error in ListenAndServe", "err", err)
	}
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}
