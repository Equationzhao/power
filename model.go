package main

import (
	"slices"

	"github.com/Equationzhao/power/criticalpower"
)

const maxRuntimes = 1000000

type CalculateRequest struct {
	PT       []criticalpower.PowerTimePoint `json:"pt"`
	Runtimes int                            `json:"runtimes"`
	Weight   float64                        `json:"weight"`
}

func (req *CalculateRequest) Normalize() {
	if req.Runtimes <= 0 {
		req.Runtimes = criticalpower.DefaultNumRuns
	} else if req.Runtimes > maxRuntimes {
		req.Runtimes = maxRuntimes
	}

	slices.SortFunc(req.PT, func(a, b criticalpower.PowerTimePoint) int {
		return int(a.Time - b.Time)
	})

	if req.Weight <= 0 {
		req.Weight = 0.0
	}
}
