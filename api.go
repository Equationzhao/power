package main

import (
	"log/slog"

	"github.com/valyala/fasthttp"
)

func main() {
	slog.Info("Server starting on :8080")
	if err := fasthttp.ListenAndServe(":8080", calculateHandler); err != nil {
		slog.Error("Error in ListenAndServe", "err", err)
	}
}
