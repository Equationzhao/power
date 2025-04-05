package main

import "github.com/Equationzhao/power/criticalpower"

func CalculateModel(data []criticalpower.PowerTimePoint, runtimes int, outlierDetect bool) (*criticalpower.CriticalPowerModel, error) {
	model := criticalpower.New(
		criticalpower.WithRunTimes(runtimes),
		criticalpower.WithOutlierDetect(),
	)
	if err := model.Fit(data); err != nil {
		return nil, err
	}
	return model, nil
}
