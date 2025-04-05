package main

import (
	"slices"

	"github.com/Equationzhao/power/criticalpower"
)

const maxRuntimes = 1000000

type CalculateRequest struct {
	PT            []PowerTimePoint `json:"pt"`
	Runtimes      int              `json:"runtimes"`
	Weight        float64          `json:"weight"`
	OutlierDetect bool             `json:"outlier_detect"`
}

func (req *CalculateRequest) Normalize() {
	if req.Runtimes <= 0 {
		req.Runtimes = criticalpower.DefaultNumRuns
	} else if req.Runtimes > maxRuntimes {
		req.Runtimes = maxRuntimes
	}

	slices.SortFunc(req.PT, func(a, b PowerTimePoint) int {
		return int(a.Time - b.Time)
	})

	if req.Weight <= 0 {
		req.Weight = 0.0
	}
}

type PowerTimePoint struct {
	Time  float64 `json:"time"`
	Power float64 `json:"power"`
}

func ConvertPowerTimePointToCP(pt []PowerTimePoint) []criticalpower.PowerTimePoint {
	cp := make([]criticalpower.PowerTimePoint, len(pt))
	for i, p := range pt {
		cp[i] = criticalpower.PowerTimePoint{
			Time:  p.Time,
			Power: p.Power,
		}
	}
	return cp
}

func ConvertCPToPowerTimePoint(cp []criticalpower.PowerTimePoint) []PowerTimePoint {
	pt := make([]PowerTimePoint, len(cp))
	for i, p := range cp {
		pt[i] = PowerTimePoint{
			Time:  p.Time,
			Power: p.Power,
		}
	}
	return pt
}

type CalculateResponse struct {
	CP             float64          `json:"cp"`
	Wprime         float64          `json:"wprime"`
	Pmax           float64          `json:"pmax"`
	Tau            float64          `json:"tau"`
	RMSE           float64          `json:"rmse"`
	VO2Max         float64          `json:"vo2max"`
	TrainingZones  TrainingZones    `json:"training_zones"`
	PowerTimeCurve []PowerTimePoint `json:"power_time_curve"`

	PowerTimePoint  []PowerTimePoint `json:"power_time_point"`
	Outliers        []PowerTimePoint `json:"outliers"`
	OutliersCount   int              `json:"outliers_count"`
	OutliersPercent float64          `json:"outliers_percent"`
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
