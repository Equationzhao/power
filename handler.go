package main

import (
	"log/slog"
	"path/filepath"

	"github.com/bytedance/sonic"
	"github.com/valyala/fasthttp"
)

type CalculateResponse struct {
	CP            float64       `json:"cp"`
	Wprime        float64       `json:"wprime"`
	Pmax          float64       `json:"pmax"`
	Tau           float64       `json:"tau"`
	RMSE          float64       `json:"rmse"`
	VO2Max        float64       `json:"vo2max"`
	TrainingZones TrainingZones `json:"training_zones"`
}

type zone struct {
	Min float64 `json:"min"`
	Max float64 `json:"max"`
}

type TrainingZones struct {
	RecoveryZone      zone `json:"recovery_zone"`
	EnduranceZone     zone `json:"endurance_zone"`
	TempoZone         zone `json:"tempo_zone"`
	ThresholdZone     zone `json:"threshold_zone"`
	VO2MaxZone        zone `json:"vo2max_zone"`
	AnaerobicZone     zone `json:"anaerobic_zone"`
	NeuromuscularZone zone `json:"neuromuscular_zone"`
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
	tzBO := model.GetTrainingZones()
	resp := CalculateResponse{
		CP:     model.CP,
		Wprime: model.Wprime,
		Pmax:   model.Pmax,
		Tau:    model.Tau,
		RMSE:   model.RMSE,
		TrainingZones: TrainingZones{
			RecoveryZone:      zone{Min: tzBO.RecoveryZone.Min, Max: tzBO.RecoveryZone.Max},
			EnduranceZone:     zone{Min: tzBO.EnduranceZone.Min, Max: tzBO.EnduranceZone.Max},
			TempoZone:         zone{Min: tzBO.TempoZone.Min, Max: tzBO.TempoZone.Max},
			ThresholdZone:     zone{Min: tzBO.ThresholdZone.Min, Max: tzBO.ThresholdZone.Max},
			VO2MaxZone:        zone{Min: tzBO.VO2MaxZone.Min, Max: tzBO.VO2MaxZone.Max},
			AnaerobicZone:     zone{Min: tzBO.AnaerobicZone.Min, Max: tzBO.AnaerobicZone.Max},
			NeuromuscularZone: zone{Min: tzBO.NeuromuscularZone.Min, Max: tzBO.NeuromuscularZone.Max},
		},
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

func mainHandler(ctx *fasthttp.RequestCtx) {
	path := string(ctx.Path())

	switch {
	case path == "/" || path == "/index.html":
		staticFilePath := filepath.Join("static", "index.html")
		if fileExists(staticFilePath) {
			fasthttp.ServeFile(ctx, staticFilePath)
			return
		}
		ctx.Redirect("/calculate", fasthttp.StatusTemporaryRedirect)

	case path == "/calculate":
		calculateHandler(ctx)

	case path == "/favicon.ico":
		ctx.SetStatusCode(fasthttp.StatusNoContent)

	default:
		if fileExists(filepath.Join("static", path)) {
			fasthttp.ServeFile(ctx, filepath.Join("static", path))
			return
		}

		ctx.Error("Not Found", fasthttp.StatusNotFound)
	}
}
