package criticalpower_test

import (
	"math"
	"math/rand/v2"
	"slices"
	"testing"

	"github.com/Equationzhao/power/criticalpower"
)

// TestOutlierDetection 测试异常值检测功能
func TestOutlierDetection(t *testing.T) {
	// 创建包含异常值的数据集
	normalData, outlierData := generateTestDataWithOutliers()
	combinedData := append(normalData, outlierData...)

	// 创建模型并拟合
	model := criticalpower.NewWithRunTimes(100000)
	err := model.Fit(combinedData)
	if err != nil {
		t.Fatalf("模型拟合失败: %v", err)
	}

	// 输出模型参数和性能
	t.Log("模型参数:")
	t.Logf("临界功率 (CP): %.1f 瓦特", model.CP)
	t.Logf("无氧储备 (W'): %.0f 焦耳", model.Wprime)
	t.Logf("最大瞬时功率 (Pmax): %.1f 瓦特", model.Pmax)
	t.Logf("时间常数 (Tau): %.1f 秒", model.Tau)
	t.Logf("拟合误差 (RMSE): %.3f", model.RMSE)

	// 输出检测到的异常值
	t.Logf("总数据点: %d", len(combinedData))
	t.Logf("真实异常值数量: %d", len(outlierData))
	t.Logf("检测到的异常值数量: %d", len(model.Outliers))

	// 检查异常值检测的准确性
	correctDetections := 0
	falsePositives := 0
	falseNegatives := 0

	// 记录每个真实异常值的索引
	trueOutlierIndices := make(map[int]struct{})
	for i := len(normalData); i < len(combinedData); i++ {
		trueOutlierIndices[i] = struct{}{}
	}

	// 计算检测准确率
	for i := range combinedData {
		_, isTrueOutlier := trueOutlierIndices[i]
		_, isDetectedOutlier := model.Outliers[i]

		if isTrueOutlier && isDetectedOutlier {
			correctDetections++
		} else if !isTrueOutlier && isDetectedOutlier {
			falsePositives++
		} else if isTrueOutlier && !isDetectedOutlier {
			falseNegatives++
		}
	}

	t.Logf("正确检测的异常值: %d (%.1f%%)", correctDetections, float64(correctDetections)/float64(len(outlierData))*100)
	t.Logf("误报 (False Positives): %d", falsePositives)
	t.Logf("漏报 (False Negatives): %d", falseNegatives)

	// 打印原始数据和识别的异常值
	t.Log("\n原始数据 (*标记为检测到的异常值):")
	for i, point := range combinedData {
		_, isOutlier := model.Outliers[i]
		outlierMark := ""
		if isOutlier {
			outlierMark = "*"
		}
		_, isTrueOutlier := trueOutlierIndices[i]
		trueOutlierMark := ""
		if isTrueOutlier {
			trueOutlierMark = " (真实异常值)"
		}
		t.Logf("%s时间: %.1f秒, 功率: %.1f瓦特%s", outlierMark, point.Time, point.Power, trueOutlierMark)
	}
}

// generateTestDataWithOutliers 生成包含正常数据和异常值的测试数据集
func generateTestDataWithOutliers() (normalData, outlierData []criticalpower.PowerTimePoint) {
	// 设置基础模型参数
	cp := 230.0       // 临界功率
	wprime := 20000.0 // 无氧工作容量
	tau := 5.0        // 时间常数

	// 生成正常数据点
	testTimes := []float64{1, 5, 10, 30, 60, 180, 300, 600, 1200, 1800}
	normalData = make([]criticalpower.PowerTimePoint, 0, len(testTimes))

	for _, t := range testTimes {
		// 使用模型公式计算理论功率
		theoreticalPower := (wprime + cp*(t+tau)) / (t + tau)

		// 添加适度随机波动 (±2%)
		noise := 1.0 + (rand.Float64()*0.04 - 0.02)
		power := theoreticalPower * noise

		normalData = append(normalData, criticalpower.PowerTimePoint{
			Time:  t,
			Power: power,
		})
	}

	// 对数据点按时间排序
	slices.SortFunc(normalData, func(a, b criticalpower.PowerTimePoint) int {
		return int(a.Time - b.Time)
	})

	// 生成不同类型的异常值数据
	outlierData = []criticalpower.PowerTimePoint{
		// 1. 过高功率异常值 (超过理论值30%以上)
		{
			Time:  120,
			Power: (wprime + cp*(120+tau)) / (120 + tau) * 1.35,
		},
		// 2. 过低功率异常值 (低于理论值30%以上)
		{
			Time:  240,
			Power: (wprime + cp*(240+tau)) / (240 + tau) * 0.65,
		},
		// 3. 违反功率-时间关系的数据点 (长时间高功率)
		{
			Time:  900,
			Power: (wprime + cp*(300+tau)) / (300 + tau) * 1.1,
		},
		// 4. 不合理的数据点 (极端值)
		{
			Time:  45,
			Power: 2500, // 不合理的高功率
		},
		// 5. 重复时间点，但功率不同
		{
			Time:  60, // 与正常数据中的60秒点重复
			Power: (wprime + cp*(60+tau)) / (60 + tau) * 1.25,
		},
		// 6. 与CP值非常接近但时间很短的点
		{
			Time:  15,
			Power: cp * 1.05,
		},
		// 7. 模拟测量误差导致的异常值
		{
			Time:  450,
			Power: (wprime + cp*(450+tau)) / (450 + tau) * (1 + math.Sin(450)*0.3),
		},
	}

	return normalData, outlierData
}
