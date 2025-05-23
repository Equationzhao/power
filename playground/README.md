# 临界功率模型最优采样点研究

## 设计

1. 生成理想的功率-时间曲线（1-3600秒），设定理想参数：
   - 临界功率 (CP) = 250.0 瓦
   - 无氧工作容量 (W') = 20000.0 焦耳
   - 时间常数 (τ) = 10.0 秒
   - 最大瞬时功率 (Pmax) = 2250.0 瓦

2. 限制采样范围在5-1200秒内，模拟实际测试约束

3. 评估不同采样策略在各种点数下对完整数据集的拟合精度

## 采样策略

五种不同的采样策略：

1. **均匀采样**：在时间轴上均匀分布点
2. **对数均匀采样**：在时间对数尺度上均匀分布点，短时间区域点更密集
3. **分段均匀采样**：按照生理重要性分配点（短时区域50%，中时区域30%，长时区域20%）
4. **随机采样**：随机选择点
5. **启发式采样**：基于生理学知识优先选择关键时间点

## 结果

某次测试中不同点数下的最佳策略：

| 点数 | 最佳策略       | 平均RMSE | 相对误差(%) |
|------|----------------|----------|-------------|
| 3    | 对数均匀采样   | 2.12     | 0.02        |
| 5    | 分段均匀采样   | 1.90     | 0.02        |
| 8    | 分段均匀采样   | 1.95     | 0.02        |
| 12   | 分段均匀采样   | 2.11     | 0.02        |
| 20   | 对数均匀采样   | 1.84     | 0.02        |
| 30   | 启发式采样     | 1.77     | 0.02        |
| 50   | 启发式采样     | 1.76     | 0.02        |
| 100  | 启发式采样     | 1.77     | 0.02        |

主要发现：
- 点数超过30个后，改进非常有限

## 建议

**无需超过30次测试**：
   - 数据显示30点以上收益极小
   - 资源可用于提高测试精度或验证测试
