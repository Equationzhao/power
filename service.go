package main

import "github.com/Equationzhao/power/criticalpower"

func CalculateModel(data []criticalpower.PowerTimePoint, runtimes int) (*criticalpower.CriticalPowerModel, error) {
	model := criticalpower.NewWithRunTimes(runtimes)
	if err := model.Fit(data); err != nil {
		return nil, err
	}
	return model, nil
}
