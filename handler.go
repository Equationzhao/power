package main

import (
	"log/slog"

	"github.com/bytedance/sonic"
	"github.com/valyala/fasthttp"
)

type CalculateResponse struct {
	CP     float64 `json:"cp"`
	Wprime float64 `json:"wprime"`
	Pmax   float64 `json:"pmax"`
	Tau    float64 `json:"tau"`
	RMSE   float64 `json:"rmse"`
	VO2Max float64 `json:"vo2max"`
}

const (
	badRequest          = `{"error": "Bad Request"}`
	internalServerError = `{"error": "Internal Server Error"}`
	methodNotAllowed    = `{"error": "Method Not Allowed"}`
)

func createErrorResponse(errMsg string) string {
	return `{"error": "` + errMsg + `"}`
}

func calculateHandler(ctx *fasthttp.RequestCtx) {
	defer func() {
		if r := recover(); r != nil {
			slog.Error("panic in calculateHandler", "error", r)
			ctx.Error(internalServerError, fasthttp.StatusInternalServerError)
		}
	}()

	if string(ctx.Method()) != "POST" {
		ctx.Error(methodNotAllowed, fasthttp.StatusMethodNotAllowed)
		return
	}
	var data CalculateRequest
	if err := sonic.Unmarshal(ctx.PostBody(), &data); err != nil {
		ctx.Error(badRequest, fasthttp.StatusBadRequest)
		return
	}
	data.Normalize()
	model, err := CalculateModel(data.PT, data.Runtimes)
	if err != nil {
		ctx.Error(createErrorResponse(err.Error()), fasthttp.StatusInternalServerError)
		return
	}
	resp := CalculateResponse{
		CP:     model.CP,
		Wprime: model.Wprime,
		Pmax:   model.Pmax,
		Tau:    model.Tau,
		RMSE:   model.RMSE,
	}
	if data.Weight > 0 {
		resp.VO2Max = model.PredictVO2Max(data.Weight)
	}
	respBytes, err := sonic.Marshal(resp)
	if err != nil {
		ctx.Error(internalServerError, fasthttp.StatusInternalServerError)
		return
	}
	ctx.Response.Header.Set("Content-Type", "application/json")
	ctx.SetBody(respBytes)
}
