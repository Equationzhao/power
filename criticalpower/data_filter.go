package criticalpower

import (
	"math"
	"slices"
)

func (m *CriticalPowerModel) detectOutliers(data []PowerTimePoint, threshold float64) {
	outlierIndices := []int{}

	// 计算每个点的残差
	residuals := make([]float64, len(data))
	for i, point := range data {
		predicted := (m.Wprime + m.CP*(point.Time+m.Tau)) / (point.Time + m.Tau)
		residuals[i] = math.Abs(predicted-point.Power) / point.Power // 相对残差
	}

	// 计算残差的四分位值
	sortedResiduals := make([]float64, len(residuals))
	copy(sortedResiduals, residuals)
	slices.Sort(sortedResiduals)

	q1Idx := len(sortedResiduals) / 4
	q3Idx := q1Idx * 3
	q1 := sortedResiduals[q1Idx]
	q3 := sortedResiduals[q3Idx]
	iqr := q3 - q1

	// 使用IQR方法检测异常值
	upperBound := q3 + threshold*iqr

	// 标记异常值
	for i, residual := range residuals {
		if residual > upperBound {
			outlierIndices = append(outlierIndices, i)
		}
	}

	if m.Outliers == nil {
		m.Outliers = make(map[int]struct{}, len(outlierIndices))
	}
	for _, index := range outlierIndices {
		m.Outliers[index] = struct{}{}
	}
}

func (m *CriticalPowerModel) totalFilter() {
	m.filterInvalidPoints()
	m.removeDuplicateTimePoints()
	m.enforcePowerTimeConsistency()
}

func (m *CriticalPowerModel) filterInvalidPoints() {
	data := m.Data
	if m.Outliers == nil {
		m.Outliers = make(map[int]struct{})
	}
	for i, point := range data {
		if point.Power <= 0 || point.Power > 3000 || point.Time <= 0 || point.Time > 3600 {
			m.Outliers[i] = struct{}{}
		}
	}
}

func (m *CriticalPowerModel) removeDuplicateTimePoints() {
	data := m.Data
	if m.Outliers == nil {
		m.Outliers = make(map[int]struct{})
	}
	ptMap := make(map[float64]PowerTimePoint, len(data))
	indexMap := make(map[float64]int, len(data))

	for i, point := range data {
		if p, ok := ptMap[point.Time]; ok {
			if point.Power > p.Power {
				m.Outliers[indexMap[point.Time]] = struct{}{}
				indexMap[point.Time] = i
			} else {
				m.Outliers[i] = struct{}{}
			}
		} else {
			indexMap[point.Time] = i
		}
	}
}

func (m *CriticalPowerModel) enforcePowerTimeConsistency() {
	if m.Outliers == nil {
		m.Outliers = make(map[int]struct{})
	}
	data := m.Data
	if len(data) <= 1 {
		return
	}

	filtered := make([]PowerTimePoint, 0, len(data))
	filtered = append(filtered, data[0])

	for i := 1; i < len(data); i++ {
		current := data[i]

		if current.Power > filtered[len(filtered)-1].Power {
			m.Outliers[i-1] = struct{}{}
			filtered = filtered[:len(filtered)-1]

			if len(filtered) == 0 || current.Power <= filtered[len(filtered)-1].Power {
				filtered = append(filtered, current)
			} else {
				m.Outliers[i] = struct{}{}
				i--
			}
		} else {
			filtered = append(filtered, current)
		}
	}
}
