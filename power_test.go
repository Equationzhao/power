package criticalpower_test

import (
	"testing"

	"criticalpower"
)

func TestMain(t *testing.T) {
	model := criticalpower.NewWithRunTimes(100000)

	data := []criticalpower.PowerTimePoint{
		{Time: 1, Power: 768},    // 1秒测试
		{Time: 5, Power: 697},    // 5秒测试
		{Time: 10, Power: 683},   // 10秒测试
		{Time: 30, Power: 482},   // 30秒测试
		{Time: 60, Power: 337},   // 1分钟测试
		{Time: 300, Power: 259},  // 5分钟测试
		{Time: 600, Power: 236},  // 10分钟测试
		{Time: 1200, Power: 233}, // 20分钟测试
	}

	err := model.Fit(data)
	if err != nil {
		t.Fatalf("模型拟合失败: %v", err)
	}

	t.Log("模型参数:")
	t.Logf("临界功率 (CP): %.1f 瓦特\n", model.CP)
	t.Logf("无氧工作容量 (W'): %.0f 焦耳\n", model.Wprime)
	t.Logf("最大瞬时功率 (Pmax): %.1f 瓦特\n", model.Pmax)
	t.Logf("时间常数 (Tau): %.1f 秒\n", model.Tau)

	// 预测60分钟的最大功率
	t.Logf("预测60分钟的最大功率: %.1f 瓦特\n", model.PredictPower(60*60))

	// 预测维持Vo2max.Min的时间
	duration, err := model.PredictTime(model.GetTrainingZones().VO2MaxZone.Min)
	if err != nil {
		t.Logf("预测失败: %v\n", err)
	} else {
		t.Logf("预测维持Vo2max.Min的最大时间: %.1f 秒\n", duration)
	}

	// 输出训练区间
	t.Log("训练区间:")
	zones := model.GetTrainingZones()
	t.Log("恢复区间:", zones.RecoveryZone)
	t.Log("耐力区间:", zones.EnduranceZone)
	t.Log("节奏区间:", zones.TempoZone)
	t.Log("阈值区间:", zones.ThresholdZone)
	t.Log("VO2Max区间:", zones.VO2MaxZone)
	t.Log("无氧区间:", zones.AnaerobicZone)
	t.Log("神经肌肉区间:", zones.NeuromuscularZone)
}
