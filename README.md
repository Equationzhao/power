# Power 


## 模型介绍

### A 3-parameter critical power model

- **临界功率 (CP)**：代表运动员可以持续长时间的功率输出极限。
- **无氧储备 (Anaerobic Reserve, W')**：在高于 CP 时，运动员能额外输出的能量储备（焦耳）。
- **时间常数 (Tau)**：模型参数，用于调节功率与时间的关系。
- **Pmax**：模型预测的最大瞬时功率，计算公式：Pmax = CP + W'/Tau。


### VO2Max
Five-Minute Power-Based Test to Predict Maximal Oxygen Consumption in Road Cycling

`VO2max = 16.6 + (8.87 × 5 min relative power output)`

### 请求格式
请求以 JSON 格式提交，主要字段如下：
- `pt`: 数组，每个元素包含字段：
  - `Time`：时间（秒）
  - `Power`：功率（瓦特）
- `runtimes`: 整数，指定模型拟合的运行次数。如果传入值小于等于 0，则使用默认值；如果过大，将被限制到最大运行次数。
- `weight`: 浮点数（可选），用于 VO2Max 预测，若值大于 0，则返回 VO2Max 计算结果。

示例请求：
```json
{
  "pt": [
    {"Time": 1, "Power": 768},
    {"Time": 5, "Power": 697},
    {"Time": 10, "Power": 683},
    {"Time": 30, "Power": 482},
    {"Time": 60, "Power": 337},
    {"Time": 300, "Power": 259},
    {"Time": 600, "Power": 236},
    {"Time": 1200, "Power": 233}
  ],
  "runtimes": 10000,
  "weight": 70.0
}
```

### 响应格式
- `cp`：临界功率（瓦特）
- `wprime`：无氧工作容量（焦耳）
- `pmax`：最大瞬时功率（瓦特）
- `tau`：时间常数（秒）
- `rmse`：拟合误差（均方根误差）
- `vo2max`：最大摄氧量（ml/kg/min，在 weight > 0 时有效）

示例响应：
```json
{
  "cp": 250.0,
  "wprime": 15000.0,
  "pmax": 350.0,
  "tau": 5.0,
  "rmse": 8.5,
  "vo2max": 45.2
}
```


## 如何运行

- 启动 API 服务：执行 `go run ./...`，服务默认监听在 `:8080` 端口。
- 调用 POST 接口进行模型拟合与预测，API 会返回上述格式的 JSON 数据。