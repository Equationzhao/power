package main

import "github.com/Equationzhao/power/criticalpower"

func CalculateModel(data []PowerTimePoint, runtimes int) (*criticalpower.CriticalPowerModel, error) {
	model := criticalpower.NewWithRunTimes(runtimes)
	pt := make([]criticalpower.PowerTimePoint, len(data))
	for i, point := range data {
		pt[i] = criticalpower.PowerTimePoint{
			Time:  point.Time,
			Power: point.Power,
		}
	}
	if err := model.Fit(pt); err != nil {
		return nil, err
	}
	return model, nil
}
