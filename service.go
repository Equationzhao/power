package main

import "github.com/Equationzhao/power/criticalpower"

func CalculateModel(data []criticalpower.PowerTimePoint, runtimes int, outlierDetect bool) (*criticalpower.CriticalPowerModel, error) {
	option := []criticalpower.ModelOption{criticalpower.WithRunTimes(runtimes)}
	if outlierDetect {
		option = append(option, criticalpower.WithOutlierDetect())
	}
	model := criticalpower.New(option...)
	if err := model.Fit(data); err != nil {
		return nil, err
	}
	return model, nil
}
