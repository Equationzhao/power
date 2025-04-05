// 功率曲线图绘制功能

/**
 * 显示功率-时间曲线弹窗
 * @param {Array} curveData - 功率曲线数据
 * @param {Array} originalPoints - 原始数据点
 * @param {Object} modelParams - 模型参数，包含cp和pmax
 * @param {Array} outliers - 异常值数据点
 */
export function showPowerTimeCurvePopup(curveData, originalPoints, modelParams, outliers) {
    const existingPopup = document.querySelector('.info-popup');
    if (existingPopup) {
        return;
    }

    // 创建弹窗容器
    const popup = document.createElement('div');
    popup.className = 'info-popup chart-popup';
    popup.innerHTML = `
        <div class="info-popup-header">
            <h3>功率曲线</h3>
            <button class="info-popup-close">&times;</button>
        </div>
        <div class="info-popup-content chart-content">
            <canvas id="powerTimeCurveChart"></canvas>
        </div>
    `;

    document.body.appendChild(popup);

    // 关闭弹窗事件
    popup.querySelector('.info-popup-close').addEventListener('click', function() {
        popup.remove();
    });

    // 点击外部关闭弹窗
    setTimeout(() => {
        document.addEventListener('click', function closeChartPopup(e) {
            if (popup && !popup.contains(e.target) && !e.target.matches('#showPowerTimeCurve')) {
                popup.remove();
                document.removeEventListener('click', closeChartPopup);
            }
        });
    }, 100);

    // 渐入显示
    setTimeout(() => {
        popup.classList.add('show');
    }, 10);

    // 绘制功率曲线图
    drawPowerTimeCurve(curveData, originalPoints, modelParams, outliers);
}

/**
 * 绘制功率-时间曲线图
 * @param {Array} curveData - 功率曲线数据
 * @param {Array} originalPoints - 原始数据点
 * @param {Object} modelParams - 模型参数，包含cp和pmax
 * @param {Array} outliers - 异常值数据点
 */
function drawPowerTimeCurve(curveData, originalPoints, modelParams, outliers) {
    const ctx = document.getElementById('powerTimeCurveChart').getContext('2d');
    
    // 转换曲线数据为适合图表显示的格式
    const chartData = curveData.map(point => ({
        x: point.time,
        y: point.power
    }));
    
    // 转换异常值数据为适合图表显示的格式
    const outlierData = outliers ? outliers.map(point => ({
        x: point.time,
        y: point.power
    })) : [];
    
    // 获取模型参数
    const cpValue = modelParams.cp;
    const pmaxValue = modelParams.pmax;

    // 添加CP渐近线数据
    const cpLineData = [
        { x: 1, y: cpValue },    // 从1秒开始(对数轴的最小值)
        { x: 3600, y: cpValue }  // 到3600秒(1小时)结束
    ];

    new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [
                {
                    label: '拟合功率',
                    data: chartData,
                    borderColor: 'rgba(52, 152, 219, 1)',
                    backgroundColor: 'rgba(52, 152, 219, 0.5)',
                    borderWidth: 2,
                    showLine: true,
                    tension: 0,
                    pointRadius: 0,
                    pointHoverRadius: 8,
                    hiddenInLegend: true,
                },
                {
                    label: '异常值',
                    data: outlierData,
                    borderColor: 'rgba(155, 89, 182, 1)',
                    backgroundColor: 'rgba(155, 89, 182, 0.8)',
                    borderWidth: 1,
                    showLine: false,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointStyle: 'triangle',
                    hiddenInLegend: true,
                },
                {
                    label: '原始数据',
                    data: originalPoints,
                    borderColor: 'rgba(231, 76, 60, 1)',
                    backgroundColor: 'rgba(231, 76, 60, 0.8)',
                    borderWidth: 1,
                    showLine: false,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointStyle: 'star',
                    hiddenInLegend: true,
                },
                {
                    label: '临界功率 (CP)',
                    data: cpLineData,
                    borderColor: 'rgb(0, 0, 0)',
                    borderWidth: 2,
                    borderDash: [6, 4],  // 虚线样式
                    showLine: true,
                    fill: false,
                    pointRadius: 0,
                    tension: 0,
                    hoverEnabled: false,
                    hitRadius: 0,
                    pointHoverRadius: 0,
                    pointHitRadius: 0,
                    pointHoverBorderWidth: 0,
                    hiddenInLegend: true,
                    meta: { skipTooltip: true }
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'nearest',
                intersect: false,
                axis: 'x'
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if (context.dataset.meta && context.dataset.meta.skipTooltip) {
                                return null;
                            }
                            const datasetLabel = context.dataset.label || '';
                            return ` ${datasetLabel}: ${context.parsed.y.toFixed(1)}w`;
                        },
                        afterLabel: function(context) {
                            const datasetLabel = context.dataset.label || '';
                            let errorInfo = '';
                            // 计算误差信息
                            if (datasetLabel === '原始数据') {
                                const currentTime = context.parsed.x;
                                const currentPower = context.parsed.y;
                                
                                // 查找对应时间点的拟合值
                                const fittedData = chartData.filter(point => point.x === currentTime);
                                const matchingPoint = fittedData.find(point => Math.abs(point.x - currentTime) < 0.001);
                                
                                if (matchingPoint) {
                                    const fittedPower = matchingPoint.y;
                                    const absoluteError = Math.abs(fittedPower - currentPower);
                                    const relativeError = (absoluteError / currentPower) * 100;
                                    errorInfo = `绝对误差 ${absoluteError.toFixed(1)}w, 相对误差 ${relativeError.toFixed(1)}%`;
                                }
                            }
                            return errorInfo;
                        },
                        beforeLabel: function(context) {
                            const datasetLabel = context.dataset.label || '';
                            if (datasetLabel === '拟合功率') {
                                return `时间: ${context.parsed.x.toFixed(1)}s`;
                            }
                        }
                    },
                    usePointStyle: true,
                    titleFont: {
                        size: 16
                    },
                    bodyFont: {
                        size: 16
                    },
                    padding: 12
                },
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        font: {
                            size: 14
                        },
                        usePointStyle: true,
                        padding: 20,
                        filter: (legendItem, chartData) => {
                            const dataset = chartData.datasets[legendItem.datasetIndex];
                            return dataset.hiddenInLegend !== true;
                        }
                    },
                    onClick: null,
                    onHover: null
                },
                customResultsDisplay: {
                    cpValue: cpValue,
                    pmaxValue: pmaxValue
                }
            },
            scales: {
                x: {
                    type: 'logarithmic',
                    position: 'bottom',
                    title: {
                        display: true,
                        text: '时间',
                        font: {
                            size: 18,
                            weight: 'bold',
                        },
                        padding: {top: 15, bottom: 15}
                    },
                    max: 3600,
                    ticks: {
                        autoSkip: false,
                        callback: function(value) {
                            const sec = [1, 5, 15];
                            const min = [60, 300, 600];
                            const hour = [3600];
                            if (sec.includes(value)) {
                                return value + 's';
                            }
                            if (min.includes(value)) {
                                return value/60 + 'm';
                            }
                            if (hour.includes(value)) {
                                return value/3600 + 'h';
                            }
                            return '';
                        },
                        font: {
                            size: 14
                        },
                        padding: 10
                    },
                    grid: {
                        drawOnChartArea: false,
                        drawBorder: true,
                        drawTicks: true
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: '功率 (w)',
                        font: {
                            size: 18,
                            weight: 'bold',
                        },
                        padding: {top: 5, bottom: 15}
                    },
                    beginAtZero: false,
                    ticks: {
                        font: {
                            size: 14
                        },
                        padding: 10
                    },
                    grid: {
                        drawOnChartArea: false,
                        drawBorder: true,
                        drawTicks: true
                    }
                }
            }
        },
        plugins: [{
            id: 'customResultsDisplay',
            beforeDraw: (chart) => {
                const ctx = chart.ctx;
                const customPlugin = chart.options.plugins.customResultsDisplay;
                const cpValue = customPlugin.cpValue;
                const pmaxValue = customPlugin.pmaxValue;
                
                ctx.font = 'bold 14px Arial';
                ctx.textAlign = 'right';
                ctx.textBaseline = 'top';
                
                const chartArea = chart.chartArea;
                
                const x = chartArea.right;
                const y = chartArea.top;
                
                // 计算背景框大小
                const cpText = `临界功率 (CP): ${cpValue.toFixed(1)} w`;
                const pmaxText = `最大瞬时功率 (Pmax): ${pmaxValue.toFixed(1)} w`;
                const textWidth = Math.max(
                    ctx.measureText(cpText).width, 
                    ctx.measureText(pmaxText).width
                );
                const padding = 10;
                
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.fillRect(
                    x - textWidth - padding * 2, 
                    y, 
                    textWidth + padding * 2, 
                    50
                );
                
                ctx.fillStyle = '#333';
                ctx.fillText(cpText, x - padding, y + padding);
                ctx.fillText(pmaxText, x - padding, y + padding + 25);
            }
        }]
    });
}

/**
 * 收集功率-时间数据点
 * @returns {Array} 格式化后的功率时间点数据
 */
export function collectPowerTimePoints() {
    const points = [];
    
    // 使用 calculate 返回的 power_time_point 数据
    if (window.calculatedData && window.calculatedData.power_time_point) {
        window.calculatedData.power_time_point.forEach(point => {
            points.push({
                x: point.time,
                y: point.power
            });
        });
        return points;
    }
    
    const pointRows = document.querySelectorAll('.point-row');
    pointRows.forEach(row => {
        const timeInput = row.querySelector('.time-input').value;
        const powerInput = row.querySelector('.power-input').value;
        if (timeInput && powerInput) {
            points.push({
                x: Number(timeInput),
                y: Number(powerInput)
            });
        }
    });
    return points;
}