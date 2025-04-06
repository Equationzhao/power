// sample_experiment.go
package main

import (
	"fmt"
	"math"
	"math/rand/v2"
	"sort"

	"github.com/Equationzhao/power/criticalpower"
)

// 模型参数，用于生成理想的功率-时间数据
const (
	idealCP     = 250.0                          // 理想临界功率
	idealWprime = 15000.0                        // 理想W'
	idealTau    = 25.0                           // 理想Tau
	idealPmax   = idealCP + idealWprime/idealTau // 理想Pmax

	// 完整数据集
	minTime = 1.0
	maxTime = 3600.0

	// 采样点范围限制
	sampleMinTime = 5.0
	sampleMaxTime = 1200.0
)

// 生成完整的功率-时间数据集，添加一些随机噪声
func generateFullDataset() []criticalpower.PowerTimePoint {
	dataset := make([]criticalpower.PowerTimePoint, 0, int(maxTime-minTime+1))

	for t := minTime; t <= maxTime; t += 1.0 {
		// 使用理想模型计算功率
		power := (idealWprime + idealCP*(t+idealTau)) / (t + idealTau)

		// 添加一些随机噪声 (±1%)
		noise := 1.0 + (rand.Float64()*0.02 - 0.01)
		power *= noise

		dataset = append(dataset, criticalpower.PowerTimePoint{
			Time:  t,
			Power: power,
		})
	}

	return dataset
}

// 获取采样范围内的数据点
func getSamplingRange(dataset []criticalpower.PowerTimePoint) []criticalpower.PowerTimePoint {
	samplingRange := make([]criticalpower.PowerTimePoint, 0)

	for _, point := range dataset {
		if point.Time >= sampleMinTime && point.Time <= sampleMaxTime {
			samplingRange = append(samplingRange, point)
		}
	}

	return samplingRange
}

// 采样策略接口
type SamplingStrategy interface {
	Name() string
	SelectPoints(dataset []criticalpower.PowerTimePoint, numPoints int) []criticalpower.PowerTimePoint
}

// 1. 均匀采样
type UniformSampling struct{}

func (s UniformSampling) Name() string {
	return "均匀采样"
}

func (s UniformSampling) SelectPoints(dataset []criticalpower.PowerTimePoint, numPoints int) []criticalpower.PowerTimePoint {
	if numPoints >= len(dataset) {
		return dataset
	}

	step := float64(len(dataset)) / float64(numPoints)
	selected := make([]criticalpower.PowerTimePoint, 0, numPoints)

	for i := 0; i < numPoints; i++ {
		idx := int(math.Round(float64(i) * step))
		if idx >= len(dataset) {
			idx = len(dataset) - 1
		}
		selected = append(selected, dataset[idx])
	}

	return selected
}

// 2. 对数均匀采样
type LogarithmicSampling struct{}

func (s LogarithmicSampling) Name() string {
	return "对数均匀采样"
}

func (s LogarithmicSampling) SelectPoints(dataset []criticalpower.PowerTimePoint, numPoints int) []criticalpower.PowerTimePoint {
	if numPoints >= len(dataset) {
		return dataset
	}

	minLogTime := math.Log(dataset[0].Time)
	maxLogTime := math.Log(dataset[len(dataset)-1].Time)
	step := (maxLogTime - minLogTime) / float64(numPoints-1)

	selected := make([]criticalpower.PowerTimePoint, 0, numPoints)

	for i := 0; i < numPoints; i++ {
		logTime := minLogTime + float64(i)*step
		targetTime := math.Exp(logTime)

		// 找到最接近的时间点
		closestIdx := 0
		minDiff := math.Abs(dataset[0].Time - targetTime)

		for j := 1; j < len(dataset); j++ {
			diff := math.Abs(dataset[j].Time - targetTime)
			if diff < minDiff {
				minDiff = diff
				closestIdx = j
			}
		}

		selected = append(selected, dataset[closestIdx])
	}

	return selected
}

// 3. 分段均匀采样 - 短时间区域更多点
type PiecewiseSampling struct{}

func (s PiecewiseSampling) Name() string {
	return "分段均匀采样"
}

func (s PiecewiseSampling) SelectPoints(dataset []criticalpower.PowerTimePoint, numPoints int) []criticalpower.PowerTimePoint {
	if numPoints >= len(dataset) {
		return dataset
	}

	// 将数据集分为三段: 短时间(1-60s), 中时间(60-300s), 长时间(300-1200s)
	// 分配点数比例: 50%, 30%, 20%
	shortTimeCutoff := 60.0
	mediumTimeCutoff := 300.0

	shortTimePoints := numPoints / 2
	mediumTimePoints := numPoints * 3 / 10
	longTimePoints := numPoints - shortTimePoints - mediumTimePoints

	// 分割数据集
	var shortTimeData, mediumTimeData, longTimeData []criticalpower.PowerTimePoint

	for _, point := range dataset {
		if point.Time <= shortTimeCutoff {
			shortTimeData = append(shortTimeData, point)
		} else if point.Time <= mediumTimeCutoff {
			mediumTimeData = append(mediumTimeData, point)
		} else {
			longTimeData = append(longTimeData, point)
		}
	}

	// 在每个部分均匀采样
	uniformStrategy := UniformSampling{}
	selected := make([]criticalpower.PowerTimePoint, 0, numPoints)

	selected = append(selected, uniformStrategy.SelectPoints(shortTimeData, shortTimePoints)...)
	selected = append(selected, uniformStrategy.SelectPoints(mediumTimeData, mediumTimePoints)...)
	selected = append(selected, uniformStrategy.SelectPoints(longTimeData, longTimePoints)...)

	// 按时间排序
	sort.Slice(selected, func(i, j int) bool {
		return selected[i].Time < selected[j].Time
	})

	return selected
}

// 4. 随机采样
type RandomSampling struct{}

func (s RandomSampling) Name() string {
	return "随机采样"
}

func (s RandomSampling) SelectPoints(dataset []criticalpower.PowerTimePoint, numPoints int) []criticalpower.PowerTimePoint {
	if numPoints >= len(dataset) {
		return dataset
	}

	// 创建索引切片
	indices := make([]int, len(dataset))
	for i := range indices {
		indices[i] = i
	}

	// 随机打乱索引
	rand.Shuffle(len(indices), func(i, j int) {
		indices[i], indices[j] = indices[j], indices[i]
	})

	// 选择前numPoints个索引
	selected := make([]criticalpower.PowerTimePoint, 0, numPoints)
	for i := 0; i < numPoints; i++ {
		selected = append(selected, dataset[indices[i]])
	}

	// 按时间排序
	sort.Slice(selected, func(i, j int) bool {
		return selected[i].Time < selected[j].Time
	})

	return selected
}

// 5. 基于领域知识的启发式采样
type HeuristicSampling struct{}

func (s HeuristicSampling) Name() string {
	return "启发式采样"
}

func (s HeuristicSampling) SelectPoints(dataset []criticalpower.PowerTimePoint, numPoints int) []criticalpower.PowerTimePoint {
	if numPoints >= len(dataset) {
		return dataset
	}

	// 根据临界功率模型的特性，我们需要:
	// 1. 非常短时间的点(1-10s)来确定Pmax
	// 2. 中等时间的点(30s-5min)来确定W'
	// 3. 长时间的点(>10min)来确定CP

	// 典型的关键时间点 (基于生理学研究)
	keyTimes := []float64{1, 5, 10, 30, 60, 180, 300, 600, 1200}

	// 如果请求的点数少于我们的关键点，选择最重要的几个
	if numPoints < len(keyTimes) {
		keyTimes = keyTimes[:numPoints]
	}

	selected := make([]criticalpower.PowerTimePoint, 0, numPoints)

	// 为每个关键时间找到最接近的时间点
	for _, targetTime := range keyTimes {
		closestIdx := 0
		minDiff := math.Abs(dataset[0].Time - targetTime)

		for j := 1; j < len(dataset); j++ {
			diff := math.Abs(dataset[j].Time - targetTime)
			if diff < minDiff {
				minDiff = diff
				closestIdx = j
			}
		}

		selected = append(selected, dataset[closestIdx])
	}

	// 如果还需要更多的点，在剩余的空间均匀分布
	if numPoints > len(keyTimes) {
		remaining := numPoints - len(keyTimes)
		additionalPoints := UniformSampling{}.SelectPoints(dataset, remaining)

		// 将已选点去除，避免重复
		existingTimes := make(map[float64]bool)
		for _, point := range selected {
			existingTimes[point.Time] = true
		}

		// 添加不重复的点
		for _, point := range additionalPoints {
			if !existingTimes[point.Time] {
				selected = append(selected, point)
				if len(selected) >= numPoints {
					break
				}
			}
		}
	}

	// 按时间排序
	sort.Slice(selected, func(i, j int) bool {
		return selected[i].Time < selected[j].Time
	})

	return selected
}

// 评估拟合效果
func evaluateFitting(sampledPoints, fullDataset []criticalpower.PowerTimePoint) (cp, wprime, tau, pmax, rmse float64) {
	// 使用采样点拟合模型
	model := criticalpower.New(criticalpower.WithRunTimes(100000))
	err := model.Fit(sampledPoints)
	if err != nil {
		fmt.Printf("拟合失败: %v\n", err)
		return 0, 0, 0, 0, math.Inf(1)
	}

	// 获取拟合参数
	cp = model.CP
	wprime = model.Wprime
	tau = model.Tau
	pmax = model.Pmax

	// 计算RMSE (对完整数据集)
	var sumSquaredError float64
	for _, point := range fullDataset {
		predictedPower := model.PredictPower(point.Time)
		err := predictedPower - point.Power
		sumSquaredError += err * err
	}

	rmse = math.Sqrt(sumSquaredError / float64(len(fullDataset)))
	return
}

// 实验结果结构
type ExperimentResult struct {
	strategyName string
	pointCount   int
	cp           float64
	wprime       float64
	tau          float64
	pmax         float64
	rmse         float64
	times        []float64 // 选择的时间点
}

// 执行实验
func runExperiment() {
	// 生成完整数据集
	fullDataset := generateFullDataset()
	fmt.Printf("生成完整数据集，共 %d 个点\n", len(fullDataset))

	// 获取采样范围内的数据点（5-600秒）
	samplingRange := getSamplingRange(fullDataset)
	fmt.Printf("采样范围内数据点（%v-%v秒），共 %d 个点\n", sampleMinTime, sampleMaxTime, len(samplingRange))

	// 准备采样策略
	strategies := []SamplingStrategy{
		UniformSampling{},
		LogarithmicSampling{},
		PiecewiseSampling{},
		RandomSampling{},
		HeuristicSampling{},
	}

	// 对不同数量的点进行测试
	pointCounts := []int{3, 5, 8, 12, 20, 30, 50, 100}

	// 存储所有实验结果
	allResults := make([]ExperimentResult, 0)

	// 多次重复实验，减少随机性影响
	const repeatCount = 10

	// 对每种点数量进行测试
	for _, pointCount := range pointCounts {
		fmt.Printf("\n===== 测试采样 %d 个点 =====\n", pointCount)

		// 每种策略的累积RMSE
		strategyRMSE := make(map[string]float64)
		strategyResults := make(map[string]ExperimentResult)

		// 重复多次实验
		for repeat := 0; repeat < repeatCount; repeat++ {
			for _, strategy := range strategies {
				// 使用当前策略选择点
				sampledPoints := strategy.SelectPoints(samplingRange, pointCount)

				// 提取选择的时间点用于显示
				times := make([]float64, len(sampledPoints))
				for i, point := range sampledPoints {
					times[i] = point.Time
				}

				// 评估拟合效果
				cp, wprime, tau, pmax, rmse := evaluateFitting(sampledPoints, fullDataset)

				// 累积RMSE
				strategyRMSE[strategy.Name()] += rmse

				// 只保存第一次运行的详细结果用于展示
				if repeat == 0 {
					strategyResults[strategy.Name()] = ExperimentResult{
						strategyName: strategy.Name(),
						pointCount:   pointCount,
						cp:           cp,
						wprime:       wprime,
						tau:          tau,
						pmax:         pmax,
						rmse:         rmse,
						times:        times,
					}
				}
			}
		}

		// 计算平均RMSE并打印结果
		fmt.Printf("\n平均 %d 次实验，选择 %d 个点进行拟合的结果:\n\n", repeatCount, pointCount)
		fmt.Printf("%-20s | %-10s | %-10s | %-10s | %-10s | %-10s\n",
			"采样策略", "CP (W)", "W' (J)", "Tau (s)", "Pmax (W)", "平均RMSE (W)")
		fmt.Printf("%-20s-+-%-10s-+-%-10s-+-%-10s-+-%-10s-+-%-10s\n",
			"--------------------", "----------", "----------", "----------", "----------", "----------")

		bestRMSE := math.Inf(1)
		bestStrategy := ""

		// 打印每种策略的结果，并找出最佳策略
		for _, strategy := range strategies {
			name := strategy.Name()
			result := strategyResults[name]
			avgRMSE := strategyRMSE[name] / float64(repeatCount)

			fmt.Printf("%-20s | %-10.1f | %-10.0f | %-10.1f | %-10.1f | %-10.2f\n",
				name, result.cp, result.wprime, result.tau, result.pmax, avgRMSE)

			// 保存结果用于后续分析
			result.rmse = avgRMSE
			allResults = append(allResults, result)

			// 更新最佳策略
			if avgRMSE < bestRMSE {
				bestRMSE = avgRMSE
				bestStrategy = name
			}
		}

		fmt.Printf("\n最佳采样策略: %s (平均RMSE = %.2f W)\n", bestStrategy, bestRMSE)

		// 输出最佳策略选择的点
		for _, strategy := range strategies {
			if strategy.Name() == bestStrategy {
				result := strategyResults[strategy.Name()]
				fmt.Printf("\n最佳策略 %s 选择的点 (时间/秒): ", strategy.Name())
				for i, t := range result.times {
					if i > 0 {
						fmt.Printf(", ")
					}
					fmt.Printf("%.0f", t)
				}
				fmt.Println()
			}
		}
	}

	// 对比不同点数量的最佳策略
	fmt.Println("\n===== 不同点数量的最佳采样策略 =====")
	fmt.Printf("%-6s | %-20s | %-10s | %-10s\n",
		"点数", "最佳策略", "平均RMSE", "相对误差(%)")
	fmt.Printf("%-6s-+-%-20s-+-%-10s-+-%-10s\n",
		"------", "--------------------", "----------", "----------")

	// 按点数分组，找出每组的最佳策略
	for _, pointCount := range pointCounts {
		bestRMSE := math.Inf(1)
		bestStrategy := ""

		for _, result := range allResults {
			if result.pointCount == pointCount && result.rmse < bestRMSE {
				bestRMSE = result.rmse
				bestStrategy = result.strategyName
			}
		}

		// 计算相对误差(相对于理想模型参数)
		relativeError := bestRMSE / ((idealCP + idealWprime) / 2) * 100

		fmt.Printf("%-6d | %-20s | %-10.2f | %-10.2f\n",
			pointCount, bestStrategy, bestRMSE, relativeError)
	}

	fmt.Printf("\n理想模型参数: CP = %.1f W, W' = %.0f J, Tau = %.1f s, Pmax = %.1f W\n",
		idealCP, idealWprime, idealTau, idealPmax)
}

// CompareSpecificSamplingPoints 对比手动选择的5个点与分段均匀采样的效果
func CompareSpecificSamplingPoints() {
	// 生成完整数据集
	fullDataset := generateFullDataset()
	fmt.Printf("生成完整数据集，共 %d 个点\n", len(fullDataset))

	// 获取采样范围内的数据点
	samplingRange := getSamplingRange(fullDataset)
	fmt.Printf("采样范围内数据点（%v-%v秒），共 %d 个点\n", sampleMinTime, sampleMaxTime, len(samplingRange))

	// 创建分段均匀采样策略
	piecewiseStrategy := PiecewiseSampling{}

	// 创建固定点采样策略
	fixedPointsStrategy := createFixedPointsStrategy([]float64{5, 30, 60, 300, 720})

	// 选择点
	piecewisePoints := piecewiseStrategy.SelectPoints(samplingRange, 5)
	fixedPoints := fixedPointsStrategy.SelectPoints(samplingRange, 5)

	// 提取时间点用于显示
	piecewiseTimes := extractTimes(piecewisePoints)
	fixedTimes := extractTimes(fixedPoints)

	// 重复实验多次减少随机性
	const repeatCount = 10
	piecewiseRMSE := 0.0
	fixedRMSE := 0.0

	// 保存第一次运行的结果用于详细分析
	var piecewiseResult, fixedResult ExperimentResult

	for i := 0; i < repeatCount; i++ {
		// 分段均匀采样
		cp, wprime, tau, pmax, rmse := evaluateFitting(piecewisePoints, fullDataset)
		piecewiseRMSE += rmse

		if i == 0 {
			piecewiseResult = ExperimentResult{
				strategyName: "分段均匀采样",
				pointCount:   5,
				cp:           cp,
				wprime:       wprime,
				tau:          tau,
				pmax:         pmax,
				rmse:         rmse,
				times:        piecewiseTimes,
			}
		}

		// 固定点采样
		cp, wprime, tau, pmax, rmse = evaluateFitting(fixedPoints, fullDataset)
		fixedRMSE += rmse

		if i == 0 {
			fixedResult = ExperimentResult{
				strategyName: "固定点",
				pointCount:   5,
				cp:           cp,
				wprime:       wprime,
				tau:          tau,
				pmax:         pmax,
				rmse:         rmse,
				times:        fixedTimes,
			}
		}
	}

	// 计算平均RMSE
	piecewiseRMSE /= float64(repeatCount)
	fixedRMSE /= float64(repeatCount)

	// 打印结果对比
	fmt.Println("\n===== 5个点采样策略对比 =====")
	fmt.Printf("%-25s | %-10s | %-10s | %-10s | %-10s | %-10s\n",
		"采样策略", "CP (W)", "W' (J)", "Tau (s)", "Pmax (W)", "平均RMSE (W)")
	fmt.Printf("%-25s-+-%-10s-+-%-10s-+-%-10s-+-%-10s-+-%-10s\n",
		"-------------------------", "----------", "----------", "----------", "----------", "----------")

	fmt.Printf("%-25s | %-10.1f | %-10.0f | %-10.1f | %-10.1f | %-10.2f\n",
		piecewiseResult.strategyName, piecewiseResult.cp, piecewiseResult.wprime, piecewiseResult.tau, piecewiseResult.pmax, piecewiseRMSE)
	fmt.Printf("%-25s | %-10.1f | %-10.0f | %-10.1f | %-10.1f | %-10.2f\n",
		fixedResult.strategyName, fixedResult.cp, fixedResult.wprime, fixedResult.tau, fixedResult.pmax, fixedRMSE)

	// 计算相对误差
	piecewiseRelErr := piecewiseRMSE / ((idealCP + idealWprime) / 2) * 100
	fixedRelErr := fixedRMSE / ((idealCP + idealWprime) / 2) * 100

	// 打印误差比较
	fmt.Printf("\n相对误差对比:\n")
	fmt.Printf("%-25s: %.2f%%\n", piecewiseResult.strategyName, piecewiseRelErr)
	fmt.Printf("%-25s: %.2f%%\n", fixedResult.strategyName, fixedRelErr)
	fmt.Printf("改进比例: %.2f%%\n", (fixedRelErr-piecewiseRelErr)/fixedRelErr*100)

	// 打印选择的点
	fmt.Printf("\n分段均匀采样选择的点: ")
	printTimes(piecewiseTimes)

	fmt.Printf("固定点采样选择的点: ")
	printTimes(fixedTimes)

	// 参数与理想值的对比
	fmt.Printf("\n参数与理想值的对比:\n")
	fmt.Printf("%-25s | %-10s | %-10s | %-10s | %-10s\n",
		"采样策略", "CP误差(%)", "W'误差(%)", "Tau误差(%)", "Pmax误差(%)")
	fmt.Printf("%-25s-+-%-10s-+-%-10s-+-%-10s-+-%-10s\n",
		"-------------------------", "----------", "----------", "----------", "----------")

	// 计算参数误差百分比
	piecewiseCPErr := math.Abs(piecewiseResult.cp-idealCP) / idealCP * 100
	piecewiseWprimeErr := math.Abs(piecewiseResult.wprime-idealWprime) / idealWprime * 100
	piecewiseTauErr := math.Abs(piecewiseResult.tau-idealTau) / idealTau * 100
	piecewisePmaxErr := math.Abs(piecewiseResult.pmax-idealPmax) / idealPmax * 100

	fixedCPErr := math.Abs(fixedResult.cp-idealCP) / idealCP * 100
	fixedWprimeErr := math.Abs(fixedResult.wprime-idealWprime) / idealWprime * 100
	fixedTauErr := math.Abs(fixedResult.tau-idealTau) / idealTau * 100
	fixedPmaxErr := math.Abs(fixedResult.pmax-idealPmax) / idealPmax * 100

	fmt.Printf("%-25s | %-10.2f | %-10.2f | %-10.2f | %-10.2f\n",
		piecewiseResult.strategyName, piecewiseCPErr, piecewiseWprimeErr, piecewiseTauErr, piecewisePmaxErr)
	fmt.Printf("%-25s | %-10.2f | %-10.2f | %-10.2f | %-10.2f\n",
		fixedResult.strategyName, fixedCPErr, fixedWprimeErr, fixedTauErr, fixedPmaxErr)

	fmt.Printf("\n理想模型参数: CP = %.1f W, W' = %.0f J, Tau = %.1f s, Pmax = %.1f W\n",
		idealCP, idealWprime, idealTau, idealPmax)
}

// 辅助函数：创建固定点采样策略
type FixedPointsSampling struct {
	fixedPoints []float64
}

func (s FixedPointsSampling) Name() string {
	return fmt.Sprintf("固定点 [%v]", s.fixedPoints)
}

func (s FixedPointsSampling) SelectPoints(dataset []criticalpower.PowerTimePoint, numPoints int) []criticalpower.PowerTimePoint {
	// 忽略numPoints参数，总是使用固定的点
	selected := make([]criticalpower.PowerTimePoint, 0, len(s.fixedPoints))

	for _, targetTime := range s.fixedPoints {
		// 找到最接近的时间点
		closestIdx := 0
		minDiff := math.Abs(dataset[0].Time - targetTime)

		for j := 1; j < len(dataset); j++ {
			diff := math.Abs(dataset[j].Time - targetTime)
			if diff < minDiff {
				minDiff = diff
				closestIdx = j
			}
		}

		selected = append(selected, dataset[closestIdx])
	}

	// 确保按时间排序
	sort.Slice(selected, func(i, j int) bool {
		return selected[i].Time < selected[j].Time
	})

	return selected
}

func createFixedPointsStrategy(pointList []float64) FixedPointsSampling {
	return FixedPointsSampling{
		fixedPoints: pointList,
	}
}

// 辅助函数：提取时间点
func extractTimes(points []criticalpower.PowerTimePoint) []float64 {
	times := make([]float64, len(points))
	for i, point := range points {
		times[i] = point.Time
	}
	return times
}

// 辅助函数：打印时间点
func printTimes(times []float64) {
	for i, t := range times {
		if i > 0 {
			fmt.Printf(", ")
		}
		fmt.Printf("%.0f", t)
	}
	fmt.Println()
}

// fullDatasetTest 使用完整的1-1200秒数据点进行测试
func fullDatasetTest() {
	// 生成完整数据集
	fullDataset := generateFullDataset()
	fmt.Printf("生成完整数据集，共 %d 个点\n", len(fullDataset))

	// 使用完整数据集拟合模型
	model := criticalpower.New(criticalpower.WithRunTimes(100000))
	err := model.Fit(fullDataset)
	if err != nil {
		fmt.Printf("模型拟合失败: %v\n", err)
		return
	}

	// 获取拟合参数
	cp := model.CP
	wprime := model.Wprime
	tau := model.Tau
	pmax := model.Pmax
	fmt.Println("模型拟合结果:")
	fmt.Printf("CP: %.1f W\n", cp)
	fmt.Printf("W': %.0f J\n", wprime)
	fmt.Printf("Tau: %.1f s\n", tau)
	fmt.Printf("Pmax: %.1f W\n", pmax)

	// 计算RMSE
	var sumSquaredError float64
	for _, point := range fullDataset {
		predictedPower := model.PredictPower(point.Time)
		err := predictedPower - point.Power
		sumSquaredError += err * err
	}
	rmse := math.Sqrt(sumSquaredError / float64(len(fullDataset)))
	fmt.Printf("RMSE: %.2f W\n", rmse)
}

func main() {
	fmt.Println("=== 临界功率模型最优采样点研究 ===")
	// runExperiment()
	// fullDatasetTest() // 使用完整数据集进行测试

	CompareSpecificSamplingPoints() // 运行专门的对比实验
}
