package main

import (
	"log/slog"
	"path/filepath"

	"slices"

	"github.com/bytedance/sonic"
	"github.com/valyala/fasthttp"
)

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

	// 计算功率-时间曲线
	var powerTimeCurve []PowerTimePoint
	timeMap := make(map[float64]struct{})
	for t := 1.0; t <= 10; t *= 1.2 {
		timeMap[t] = struct{}{}
	}
	// 插入固定的几个重要时间点
	// 1s - 60s
	// 60s 之后每隔 5s 一个点
	// 2m 之后每隔 10s 一个点
	// 5m 之后每隔 30s 一个点
	// 10m 之后每隔 1min 一个点
	// 1h 之后每隔 5min 一个点
	// 生成代码
	for i := 1; i <= 60; i++ {
		timeMap[float64(i)] = struct{}{}
	}
	for i := 60; i <= 120; i += 5 {
		timeMap[float64(i)] = struct{}{}
	}
	for i := 120; i <= 300; i += 10 {
		timeMap[float64(i)] = struct{}{}
	}
	for i := 300; i <= 600; i += 30 {
		timeMap[float64(i)] = struct{}{}
	}
	for i := 600; i <= 3600; i += 60 {
		timeMap[float64(i)] = struct{}{}
	}
	for i := 3600; i <= 7200; i += 300 {
		timeMap[float64(i)] = struct{}{}
	}
	for _, t := range data.PT {
		timeMap[t.Time] = struct{}{}
	}
	var times []float64
	for t := range timeMap {
		times = append(times, t)
	}
	slices.Sort(times)
	for _, t := range times {
		powerTimeCurve = append(powerTimeCurve, PowerTimePoint{
			Time:  t,
			Power: model.PredictPower(t),
		})
	}
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
		PowerTimeCurve: powerTimeCurve,
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
		staticFilePath := filepath.Join("static", "favicon.ico")
		if fileExists(staticFilePath) {
			fasthttp.ServeFile(ctx, staticFilePath)
			return
		}

	default:
		if fileExists(filepath.Join("static", path)) {
			fasthttp.ServeFile(ctx, filepath.Join("static", path))
			return
		}

		ctx.Error("Not Found", fasthttp.StatusNotFound)
	}
}
