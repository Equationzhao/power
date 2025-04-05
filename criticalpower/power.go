// Package criticalpower 功率模型
package criticalpower

import (
	"errors"
	"math"
	"math/rand/v2"
	"runtime"
	"slices"
	"sync"
	"time"
)

// PowerTimePoint 代表功率-时间测试的一个数据点
type PowerTimePoint struct {
	Time  float64 // 时间（秒）
	Power float64 // 功率（瓦特）
}

// CriticalPowerModel 表示三参数临界功率模型
type CriticalPowerModel struct {
	CP     float64 // 临界功率（瓦特）
	Wprime float64 // 无氧工作容量（焦耳）
	Pmax   float64 // 最大瞬时功率（瓦特）
	Tau    float64 // 时间常数（秒）
	RMSE   float64 // 拟合误差（均方根误差）

	Data     []PowerTimePoint // 原始数据点
	Outliers map[int]struct{} // 异常值索引

	numRuns       int  // 运行次数
	outlierDetect bool // 是否检测异常值
}

const DefaultNumRuns = 10000

// ModelOption 模型选项
type ModelOption func(*CriticalPowerModel)

// WithRunTimes 设置运行次数
func WithRunTimes(numRuns int) ModelOption {
	return func(m *CriticalPowerModel) {
		if numRuns <= 0 {
			numRuns = DefaultNumRuns
		}
		m.numRuns = numRuns
	}
}

// WithOutlierDetect 设置是否检测异常值
func WithOutlierDetect() ModelOption {
	return func(m *CriticalPowerModel) {
		m.outlierDetect = true
	}
}

// New 创建模型，可以传入选项
func New(options ...ModelOption) *CriticalPowerModel {
	m := &CriticalPowerModel{
		numRuns:       DefaultNumRuns,
		outlierDetect: true, // 默认开启异常值检测
	}

	for _, option := range options {
		option(m)
	}

	return m
}

// fit 根据功率-时间数据拟合三参数临界功率模型
func (m *CriticalPowerModel) fit() error {
	data := m.Data
	if len(data) < 3 {
		return errors.New("至少需要3个数据点来拟合三参数模型")
	}

	if len(m.Outliers) > 0 {
		filteredData := make([]PowerTimePoint, 0, len(data)-len(m.Outliers))
		for i, point := range data {
			if _, ok := m.Outliers[i]; !ok {
				filteredData = append(filteredData, point)
			}
		}
		data = filteredData
	}

	// 获取数据中的最大功率和最小功率
	maxPower := 0.0
	minPower := math.MaxFloat64
	for _, point := range data {
		if point.Power > maxPower {
			maxPower = point.Power
		}
		if point.Power < minPower {
			minPower = point.Power
		}
	}

	// 预估CP范围，一般来说CP约为所有功率点的下四分位数到最小功率之间的值
	powerList := make([]float64, len(data))
	for i, point := range data {
		powerList[i] = point.Power
	}
	slices.Sort(powerList)
	lowerQuartileIndex := len(powerList) / 4
	estimatedMinCP := minPower * 0.9
	estimatedMaxCP := powerList[lowerQuartileIndex]

	numRuns := m.numRuns
	workers := runtime.NumCPU()
	var wg sync.WaitGroup
	tasks := make(chan struct{}, numRuns)
	results := make(chan struct {
		cp     float64
		wprime float64
		tau    float64
		mse    float64
		mrse   float64
	}, numRuns)

	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for range tasks {
				initialCP := estimatedMinCP + rand.Float64()*(estimatedMaxCP-estimatedMinCP)
				initialWprime := 5000 + 30000*rand.Float64()
				initialTau := 0.5 + 25*rand.Float64()

				cp, wprime, tau, err := optimizeModel(data, initialCP, initialWprime, initialTau)
				if err != nil {
					continue
				}
				mrse := relativeMeanSquaredError(data, cp, wprime, tau)
				mse := absoluteMeanSquaredError(data, cp, wprime, tau)
				results <- struct {
					cp     float64
					wprime float64
					tau    float64
					mse    float64
					mrse   float64
				}{cp, wprime, tau, mse, mrse}
			}
		}()
	}

	for i := 0; i < numRuns; i++ {
		tasks <- struct{}{}
	}
	close(tasks)

	go func() {
		wg.Wait()
		close(results)
	}()

	bestCP, bestWprime, bestTau := 0.0, 0.0, 0.0
	bestError := math.Inf(1)
	bestErrorAbsolute := math.Inf(1)
	for res := range results {
		if res.mrse < bestError {
			bestError = res.mrse
			bestErrorAbsolute = res.mse
			bestCP, bestWprime, bestTau = res.cp, res.wprime, res.tau
		}
	}

	if bestError == math.Inf(1) {
		return errors.New("模型拟合失败")
	}

	m.CP = bestCP
	m.Wprime = bestWprime
	m.Tau = bestTau
	m.Pmax = bestCP + bestWprime/bestTau
	m.RMSE = math.Sqrt(bestErrorAbsolute)

	return nil
}

func (m *CriticalPowerModel) Fit(data []PowerTimePoint) error {
	m.Data = data
	if m.outlierDetect {
		m.totalFilter()
	}
	err := m.fit()
	if err != nil {
		return err
	}
	if m.outlierDetect {
		// 重新拟合模型，排除异常值
		for range 10 {
			m.detectOutliers(3)
			m.detectNonMaximalEffort()
			err = m.fit()
			if err != nil {
				return err
			}
		}
	}
	return nil
}

// optimizeModel 优化模型参数
func optimizeModel(data []PowerTimePoint, initialCP, initialWprime, initialTau float64) (cp, wprime, tau float64, err error) {
	// 使用模拟退火算法优化参数
	cp = initialCP
	wprime = initialWprime
	tau = initialTau

	// 改进的模拟退火参数
	temperature := 2000.0    // 更高的初始温度提供更大的搜索范围
	finalTemperature := 0.01 // 更低的最终温度提高精度
	coolingRate := 0.97      // 更慢的冷却速率允许更充分的搜索
	iterations := 20000      // 更多迭代次数

	// 记录没有改进的次数
	noImprovementCount := 0
	maxNoImprovements := 1000 // 如果1000次迭代没有改进，重新加热

	// 自适应步长
	cpStep := 5.0
	wprimeStep := 1000.0
	tauStep := 1.0

	// 当前解的误差
	currentError := relativeMeanSquaredError(data, cp, wprime, tau)

	// 最佳解
	bestCP, bestWprime, bestTau := cp, wprime, tau
	bestError := currentError

	for iter := 0; iter < iterations && temperature > finalTemperature; iter++ {
		// 使用自适应步长
		cpStepSize := cpStep * temperature / 2000.0
		wprimeStepSize := wprimeStep * temperature / 2000.0
		tauStepSize := tauStep * temperature / 2000.0

		// 生成新的候选解
		newCP := cp + (rand.Float64()*2-1)*cpStepSize
		newWprime := wprime + (rand.Float64()*2-1)*wprimeStepSize
		newTau := tau + (rand.Float64()*2-1)*tauStepSize

		// 确保参数在合理范围内
		if newCP < 50 {
			newCP = 50
		}
		if newWprime < 500 {
			newWprime = 500
		}
		if newTau < 0.5 {
			newTau = 0.5
		}

		// 计算新解的误差
		newError := relativeMeanSquaredError(data, newCP, newWprime, newTau)

		// 决定是否接受新解
		acceptNewSolution := false

		// 如果新解更好，总是接受
		if newError < currentError {
			acceptNewSolution = true
		} else {
			// 如果新解更差，以一定概率接受（模拟退火的核心）
			// 概率随着温度降低而减小，随着解的差异增大而减小
			delta := newError - currentError
			acceptanceProbability := math.Exp(-delta / temperature)
			if rand.Float64() < acceptanceProbability {
				acceptNewSolution = true
			}
		}

		if acceptNewSolution {
			cp, wprime, tau = newCP, newWprime, newTau
			currentError = newError

			// 更新最佳解
			if currentError < bestError {
				bestCP, bestWprime, bestTau = cp, wprime, tau
				bestError = currentError
				noImprovementCount = 0 // 重置无改进计数
			} else {
				noImprovementCount++
			}
		} else {
			noImprovementCount++
		}

		// 如果长时间没有改进，重新加热
		if noImprovementCount >= maxNoImprovements {
			temperature = temperature * 1.5 // 重新加热
			noImprovementCount = 0          // 重置计数器
		} else {
			// 正常降温
			temperature *= coolingRate
		}
	}

	// 如果最终误差太大，可能拟合失败
	if bestError > 1000 {
		return 0, 0, 0, errors.New("优化失败：误差过大")
	}

	return bestCP, bestWprime, bestTau, nil
}

// 计算绝对均方误差(MSE)
func absoluteMeanSquaredError(data []PowerTimePoint, cp, wprime, tau float64) float64 {
	var sumSquaredError float64

	for _, point := range data {
		t := point.Time
		observedPower := point.Power

		// 模型预测的功率：P(t) = (W' + CP × (t + τ))/(t + τ)
		predictedPower := (wprime + cp*(t+tau)) / (t + tau)

		err := predictedPower - observedPower
		sumSquaredError += err * err
	}

	return sumSquaredError / float64(len(data))
}

// 计算相对均方误差(MSRE)
func relativeMeanSquaredError(data []PowerTimePoint, cp, wprime, tau float64) float64 {
	var sumSquaredError float64

	for _, point := range data {
		t := point.Time
		observedPower := point.Power

		// 模型预测的功率：P(t) = (W' + CP × (t + τ))/(t + τ)
		predictedPower := (wprime + cp*(t+tau)) / (t + tau)

		err := predictedPower - observedPower
		// 使用相对误差的平方，这样可以使模型更加重视低功率区域的拟合
		// 避免高功率点支配误差计算
		relativeErr := err / observedPower
		sumSquaredError += relativeErr * relativeErr
	}

	// 使用均方相对误差
	return sumSquaredError / float64(len(data))
}

// PredictPower 预测给定时间的最大功率输出
func (m *CriticalPowerModel) PredictPower(time float64) float64 {
	if time <= 0 {
		return m.Pmax
	}
	return (m.Wprime + m.CP*(time+m.Tau)) / (time + m.Tau)
}

// PredictTime 预测维持给定功率的最大时间
func (m *CriticalPowerModel) PredictTime(power float64) (float64, error) {
	if power <= m.CP {
		return math.Inf(1), nil // 低于CP的功率理论上可以无限维持
	}
	if power > m.Pmax {
		return 0, errors.New("功率超过最大瞬时功率")
	}

	// t = W'/(P-CP) - W'/(Pmax-CP)
	return m.Wprime/(power-m.CP) - m.Tau, nil
}

func (m *CriticalPowerModel) predict5minPower() float64 {
	max5minPower := m.PredictPower(300)
	return max5minPower
}

// PredictVO2Max
// https://pubmed.ncbi.nlm.nih.gov/34225254/
// Five-Minute Power-Based Test to Predict Maximal Oxygen Consumption in Road Cycling
func (m *CriticalPowerModel) PredictVO2Max(weight float64) float64 {
	// VO2max (ml/kg/min) = 10.8 * 5分钟相对功率(W/kg) +7
	return 16.6 + 8.87*(m.predict5minPower()/weight)
}

// PredictCurve 使用模型预测from到to内每秒的最大功率输出。
func (m *CriticalPowerModel) PredictCurve(from, to time.Duration) []float64 {
	curve := make([]float64, 3600)
	for i := from / time.Second; i <= to/time.Second; i++ {
		curve[i-1] = m.PredictPower(float64(i))
	}
	return curve
}

type zone struct {
	Min float64
	Max float64
}

var (
	// 恢复区间
	RecoveryMinRatio = 0.0
	RecoveryMaxRatio = 0.6

	// 耐力区间
	EnduranceMinRatio = 0.6
	EnduranceMaxRatio = 0.9

	// 节奏区间
	TempoMinRatio = 0.9
	TempoMaxRatio = 0.95

	// 阈值区间
	ThresholdMinRatio = 0.95
	ThresholdMaxRatio = 1.05

	// VO2Max区间
	VO2MaxMinRatio = 1.05
	VO2MaxMaxRatio = 1.3

	// 无氧区间
	AnaerobicMinRatio = 1.3 // 基于 CP
	AnaerobicMaxRatio = 0.8 // 基于 Pmax

	// 神经肌肉区间
	NeuromuscularMinRatio = 0.8 // 基于 Pmax
	NeuromuscularMaxRatio = 1.0 // 基于 Pmax
)

type TrainingZones struct {
	RecoveryZone      zone // 恢复区间：RecoveryMinRatio 到 RecoveryMaxRatio CP
	EnduranceZone     zone // 耐力区间：EnduranceMinRatio 到 EnduranceMaxRatio CP
	TempoZone         zone // 节奏区间：TempoMinRatio 到 TempoMaxRatio CP
	ThresholdZone     zone // 阈值区间：ThresholdMinRatio 到 ThresholdMaxRatio CP
	VO2MaxZone        zone // VO2Max区间：VO2MaxMinRatio 到 VO2MaxMaxRatio CP
	AnaerobicZone     zone // 无氧区间：AnaerobicMinRatio CP 到 AnaerobicMaxRatio Pmax
	NeuromuscularZone zone // 神经肌肉区间：NeuromuscularMinRatio Pmax 到 NeuromuscularMaxRatio Pmax
}

// GetTrainingZones 返回基于CP的训练区间
func (m *CriticalPowerModel) GetTrainingZones() TrainingZones {
	return TrainingZones{
		RecoveryZone:      zone{Min: RecoveryMinRatio * m.CP, Max: RecoveryMaxRatio * m.CP},
		EnduranceZone:     zone{Min: EnduranceMinRatio * m.CP, Max: EnduranceMaxRatio * m.CP},
		TempoZone:         zone{Min: TempoMinRatio * m.CP, Max: TempoMaxRatio * m.CP},
		ThresholdZone:     zone{Min: ThresholdMinRatio * m.CP, Max: ThresholdMaxRatio * m.CP},
		VO2MaxZone:        zone{Min: VO2MaxMinRatio * m.CP, Max: VO2MaxMaxRatio * m.CP},
		AnaerobicZone:     zone{Min: AnaerobicMinRatio * m.CP, Max: AnaerobicMaxRatio * m.Pmax},
		NeuromuscularZone: zone{Min: NeuromuscularMinRatio * m.Pmax, Max: NeuromuscularMaxRatio * m.Pmax},
	}
}
