// Package criticalpower 功率模型
package criticalpower

import (
	"errors"
	"math"
	"math/rand/v2"
	"runtime"
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

	numRuns int // 运行次数
}

const DefaultNumRuns = 10000

func New() *CriticalPowerModel {
	m := &CriticalPowerModel{
		numRuns: DefaultNumRuns,
	}
	return m
}

// NewWithRunTimes 指定运行次数
func NewWithRunTimes(numRuns int) *CriticalPowerModel {
	if numRuns <= 0 {
		numRuns = DefaultNumRuns
	}

	m := &CriticalPowerModel{
		numRuns: numRuns,
	}
	return m
}

// Fit 根据功率-时间数据拟合三参数临界功率模型
func (m *CriticalPowerModel) Fit(data []PowerTimePoint) error {
	if len(data) < 3 {
		return errors.New("至少需要3个数据点来拟合三参数模型")
	}

	// 获取数据中的最大功率作为参考
	maxPower := 0.0
	for _, point := range data {
		if point.Power > maxPower {
			maxPower = point.Power
		}
	}

	numRuns := m.numRuns
	workers := runtime.NumCPU()
	var wg sync.WaitGroup
	tasks := make(chan struct{}, numRuns)
	results := make(chan struct {
		cp     float64
		wprime float64
		tau    float64
		mse    float64
	}, numRuns)

	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for range tasks {
				initialCP := maxPower * (0.5 + 0.2*rand.Float64())
				initialWprime := 10000 + 20000*rand.Float64()
				initialTau := 1 + 14*rand.Float64()
				cp, wprime, tau, err := optimizeModel(data, initialCP, initialWprime, initialTau)
				if err != nil {
					continue
				}
				mse := meanSquaredError(data, cp, wprime, tau)
				results <- struct {
					cp     float64
					wprime float64
					tau    float64
					mse    float64
				}{cp, wprime, tau, mse}
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
	for res := range results {
		if res.mse < bestError {
			bestError = res.mse
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
	m.RMSE = math.Sqrt(bestError)

	return nil
}

// optimizeModel 优化模型参数
func optimizeModel(data []PowerTimePoint, initialCP, initialWprime, initialTau float64) (cp, wprime, tau float64, err error) {
	// 使用模拟退火算法优化参数
	cp = initialCP
	wprime = initialWprime
	tau = initialTau

	// 模拟退火参数
	temperature := 1000.0
	coolingRate := 0.99
	iterations := 10000
	minTemperature := 0.1

	// 当前解的误差
	currentError := meanSquaredError(data, cp, wprime, tau)

	// 最佳解
	bestCP, bestWprime, bestTau := cp, wprime, tau
	bestError := currentError

	for i := 0; i < iterations && temperature > minTemperature; i++ {
		// 生成新的候选解
		newCP := cp + (rand.Float64()*2-1)*temperature*0.1
		newWprime := wprime + (rand.Float64()*2-1)*temperature*100
		newTau := tau + (rand.Float64()*2-1)*temperature*0.1

		// 确保参数在合理范围内
		if newCP < 100 {
			newCP = 100
		}
		if newWprime < 1000 {
			newWprime = 1000
		}
		if newTau < 1 {
			newTau = 1
		}

		// 计算新解的误差
		newError := meanSquaredError(data, newCP, newWprime, newTau)

		// 决定是否接受新解
		if newError < currentError || rand.Float64() < math.Exp((currentError-newError)/temperature) {
			cp, wprime, tau = newCP, newWprime, newTau
			currentError = newError

			// 更新最佳解
			if currentError < bestError {
				bestCP, bestWprime, bestTau = cp, wprime, tau
				bestError = currentError
			}
		}

		// 降温
		temperature *= coolingRate
	}

	// 如果最终误差太大，可能拟合失败
	if bestError > 10000 {
		return 0, 0, 0, errors.New("优化失败：误差过大")
	}

	return bestCP, bestWprime, bestTau, nil
}

// 计算模型预测的均方误差
func meanSquaredError(data []PowerTimePoint, cp, wprime, tau float64) float64 {
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
