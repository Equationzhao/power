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
            <div class="popup-actions">
                <button id="chartSettingsBtn" class="btn btn-secondary">曲线设置</button>
                <div class="download-container">
                    <button id="downloadChartBtn" class="btn btn-secondary">下载</button>
                    <div class="download-options" id="downloadOptions">
                        <button class="download-option" data-format="png">PNG</button>
                        <button class="download-option" data-format="jpg">JPG</button>
                        <button class="download-option" data-format="csv">CSV</button>
                    </div>
                </div> 
                <button class="info-popup-close">&times;</button>
            </div>
        </div>
        <div class="info-popup-content chart-content">
            <canvas id="powerTimeCurveChart"></canvas>
        </div>
    `;

    document.body.appendChild(popup);

    // 防止点击弹窗内部关闭弹窗
    popup.addEventListener('click', function(e) {
        e.stopPropagation();
    });

    // 关闭弹窗事件
    popup.querySelector('.info-popup-close').addEventListener('click', function() {
        // 先关闭设置弹窗（如果存在）
        const settingsPopup = document.getElementById('chartSettingsPopup');
        if (settingsPopup) {
            settingsPopup.remove();
        }
        
        // 清除全局图表实例引用
        window.powerChart = null;
        
        popup.remove();
    });

    // 渐入显示
    setTimeout(() => {
        popup.classList.add('show');
    }, 10);

    // 绘制功率曲线图
    loadChartSettings();
    drawPowerTimeCurve(curveData, originalPoints, modelParams, outliers);
    
    // 处理下载按钮逻辑
    setupDownloadButton();
    
    // 设置曲线设置按钮点击事件
    document.getElementById('chartSettingsBtn').addEventListener('click', function(e) {
        e.stopPropagation(); // 防止事件冒泡
        showChartSettingsPopup();
    });
}

/**
 * 显示曲线设置弹窗
 */
function showChartSettingsPopup() {
    // 如果已有弹窗，则移除
    const existingSettingsPopup = document.getElementById('chartSettingsPopup');
    if (existingSettingsPopup) {
        existingSettingsPopup.remove();
        return;
    }
    
    // 获取当前设置
    const settings = getChartSettings();
    
    // 创建设置弹窗
    const settingsPopup = document.createElement('div');
    settingsPopup.id = 'chartSettingsPopup';
    settingsPopup.className = 'settings-popup';
    settingsPopup.innerHTML = `
        <div class="settings-popup-content">
            <div class="settings-popup-header">
                <h3>曲线设置</h3>
                <button class="info-popup-close">&times;</button>
            </div>
            <div class="settings-options">
                <div class="settings-option">
                    <label for="showOriginalData">展示原始值</label>
                    <label class="switch">
                        <input type="checkbox" id="showOriginalData" ${settings.showOriginalData ? 'checked' : ''}>
                        <span class="slider round"></span>
                    </label>
                </div>
                <div class="settings-option settings-option-nested ${!settings.showOriginalData ? 'disabled' : ''}">
                    <label for="showOutliers" class="${!settings.showOriginalData ? 'disabled' : ''}">展示异常值</label>
                    <label class="switch ${!settings.showOriginalData ? 'disabled-switch' : ''}">
                        <input type="checkbox" id="showOutliers" ${settings.showOutliers ? 'checked' : ''} ${!settings.showOriginalData ? 'disabled' : ''}>
                        <span class="slider round"></span>
                        <span class="tooltip-text">请先打开"展示原始值"</span>
                    </label>
                </div>
                <div class="settings-option">
                    <label for="showNonIntegerTime">展示非整数时间</label>
                    <label class="switch">
                        <input type="checkbox" id="showNonIntegerTime" ${settings.showNonIntegerTime ? 'checked' : ''}>
                        <span class="slider round"></span>
                    </label>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(settingsPopup);
    
    // 防止点击设置弹窗内部关闭曲线弹窗
    settingsPopup.addEventListener('click', function(e) {
        e.stopPropagation();
    });
    
    // 关闭按钮点击事件
    settingsPopup.querySelector('.info-popup-close').addEventListener('click', function(e) {
        e.stopPropagation();
        
        // 在关闭之前应用当前设置
        // applySettings();
        
        settingsPopup.remove();
    });
    
    // 渐入显示弹窗
    setTimeout(() => {
        settingsPopup.classList.add('show');
    }, 10);
    
    // 设置开关联动逻辑和即时生效
    const showOriginalDataSwitch = document.getElementById('showOriginalData');
    const showOutliersSwitch = document.getElementById('showOutliers');
    const showNonIntegerTimeSwitch = document.getElementById('showNonIntegerTime');
    
    // 展示原始值开关逻辑
    showOriginalDataSwitch.addEventListener('change', function() {
        // 更新异常值开关状态
        if (!this.checked) {
            showOutliersSwitch.checked = false;
            showOutliersSwitch.disabled = true;
            document.querySelector('label[for="showOutliers"]').classList.add('disabled');
            document.querySelector('.settings-option-nested').classList.add('disabled');
        } else {
            showOutliersSwitch.disabled = false;
            document.querySelector('label[for="showOutliers"]').classList.remove('disabled');
            document.querySelector('.settings-option-nested').classList.remove('disabled');
            
            // 确保当原始值开关打开时，tooltip完全隐藏
            const tooltipElement = document.querySelector('.tooltip-text');
            if (tooltipElement) {
                tooltipElement.style.visibility = 'hidden';
                tooltipElement.style.opacity = '0';
            }
        }
        
        // 立即应用设置
        applySettings();
    });
    
    // 展示异常值开关逻辑
    showOutliersSwitch.addEventListener('change', function() {
        // 立即应用设置
        applySettings();
    });
    
    // 当"展示原始值"关闭时，点击"展示异常值"开关的处理
    const outlierSwitchContainer = document.querySelector('.settings-option-nested');
    if (outlierSwitchContainer) {
        // 当"展示原始值"状态改变时，更新开关样式
        showOriginalDataSwitch.addEventListener('change', function() {
            const switchLabel = outlierSwitchContainer.querySelector('.switch');
            if (!this.checked) {
                switchLabel.classList.add('disabled-switch');
            } else {
                switchLabel.classList.remove('disabled-switch');
            }
        });
        
        // 处理禁用状态下的点击事件
        const outlierSwitchLabel = outlierSwitchContainer.querySelector('.switch');
        outlierSwitchLabel.addEventListener('click', function(e) {
            // 只有当"展示原始值"关闭时才显示tooltip
            if (!showOriginalDataSwitch.checked) {
                // 阻止对checkbox的操作
                e.preventDefault();
                e.stopPropagation();
                
                // 显示tooltip
                const tooltip = this.querySelector('.tooltip-text');
                if (tooltip) {
                    tooltip.style.visibility = 'visible';
                    tooltip.style.opacity = '1';
                    
                    // 短暂显示后隐藏
                    setTimeout(() => {
                        tooltip.style.visibility = '';
                        tooltip.style.opacity = '';
                    }, 200);
                }
            }
        });
    }
    
    // 展示非整数时间开关逻辑
    showNonIntegerTimeSwitch.addEventListener('change', function() {
        // 立即应用设置
        applySettings();
    });
    
    // 应用设置并重绘图表
    function applySettings() {
        const newSettings = {
            showOriginalData: showOriginalDataSwitch.checked,
            showOutliers: showOutliersSwitch.checked,
            showNonIntegerTime: showNonIntegerTimeSwitch.checked
        };
        
        // 保存设置到localStorage和全局变量中
        saveChartSettings(newSettings);
        window.chartSettings = newSettings;
        
        // 重新绘制图表
        const chartData = window.calculatedData.power_time_curve;
        const originalPoints = collectPowerTimePoints();
        const modelParams = {
            cp: window.calculatedData.cp,
            pmax: window.calculatedData.pmax
        };
        const outliers = window.calculatedData.outliers;
        
        drawPowerTimeCurve(chartData, originalPoints, modelParams, outliers);
    }
}

/**
 * 获取图表设置
 * @returns {Object} 图表设置对象
 */
function getChartSettings() {
    const defaultSettings = {
        showOriginalData: true,
        showOutliers: true,
        showNonIntegerTime: true
    };
    
    const savedSettings = localStorage.getItem('chartSettings');
    if (savedSettings) {
        try {
            return JSON.parse(savedSettings);
        } catch (e) {
            console.error('解析图表设置出错:', e);
            return defaultSettings;
        }
    }
    
    return defaultSettings;
}

/**
 * 保存图表设置
 * @param {Object} settings - 图表设置对象
 */
function saveChartSettings(settings) {
    localStorage.setItem('chartSettings', JSON.stringify(settings));
}

/**
 * 加载图表设置
 */
function loadChartSettings() {
    if (!window.chartSettings) {
        window.chartSettings = getChartSettings();
    }
}

/**
 * 设置下载按钮功能
 */
function setupDownloadButton() {
    const downloadBtn = document.getElementById('downloadChartBtn');
    const downloadOptions = document.getElementById('downloadOptions');
    
    // 下载按钮点击事件
    downloadBtn.addEventListener('click', function(e) {
        e.stopPropagation(); // 阻止事件冒泡
        downloadOptions.classList.toggle('show');
    });
    
    // 点击任意位置关闭下拉框
    document.addEventListener('click', function(e) {
        if (!e.target.matches('#downloadChartBtn') && downloadOptions.classList.contains('show')) {
            downloadOptions.classList.remove('show');
        }
    });
    
    // 格式选项点击事件
    document.querySelectorAll('.download-option').forEach(option => {
        option.addEventListener('click', function(e) {
            e.stopPropagation();
            const format = this.getAttribute('data-format');
            downloadChart(format);
            downloadOptions.classList.remove('show');
        });
    });
}

/**
 * 下载图表为指定格式
 * @param {string} format - 图表格式（png, jpg 或 csv）
 */
function downloadChart(format) {
    const canvas = document.getElementById('powerTimeCurveChart');
    
    // 获取当前主题模式
    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
    
    // 获取CP值用于文件名
    const cpValue = window.calculatedData ? window.calculatedData.cp.toFixed(1) : '0';
    
    // 处理CSV下载
    if (format === 'csv') {
        // 获取拟合曲线数据
        const curveData = window.calculatedData ? window.calculatedData.power_time_curve : [];
        if (!curveData || curveData.length === 0) {
            alert('没有可用的拟合数据');
            return;
        }
        
        // 创建CSV内容
        let csvContent = 'time,power\n';
        curveData.forEach(point => {
            csvContent += `${point.time},${point.power}\n`;
        });
        
        // 创建Blob对象
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        
        // 创建下载链接
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = `拟合功率曲线_cp_${cpValue}.csv`;
        
        // 模拟点击下载
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        // 释放URL对象
        URL.revokeObjectURL(downloadLink.href);
        return;
    }
    
    let dataURL;
    
    if (format === 'jpg') {
        // 创建适合当前主题的背景
        const context = canvas.getContext('2d');
        const currentImageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        // 保存当前绘图状态
        context.save();
        
        // 创建与当前主题匹配的背景
        context.globalCompositeOperation = 'destination-over';
        context.fillStyle = isDarkMode ? '#1e1e1e' : '#FFFFFF'; // 黑暗模式使用深色背景
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // 生成数据URL
        dataURL = canvas.toDataURL('image/jpeg', 0.95);
        
        // 恢复原始绘图状态
        context.restore();
        context.putImageData(currentImageData, 0, 0);
    } else {
        // PNG格式需要先创建新画布来设置背景色
        const newCanvas = document.createElement('canvas');
        newCanvas.width = canvas.width;
        newCanvas.height = canvas.height;
        const newContext = newCanvas.getContext('2d');
        
        // 绘制背景色
        newContext.fillStyle = isDarkMode ? '#1e1e1e' : '#FFFFFF';
        newContext.fillRect(0, 0, newCanvas.width, newCanvas.height);
        
        // 将原始画布内容绘制到新画布上
        newContext.drawImage(canvas, 0, 0);
        
        // 从新画布生成数据URL
        dataURL = newCanvas.toDataURL('image/png');
    }
    
    // 创建下载链接，文件名包含CP值
    const downloadLink = document.createElement('a');
    downloadLink.href = dataURL;
    downloadLink.download = `骑行功率曲线_cp_${cpValue}.${format}`;
    
    // 模拟点击下载
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
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
    const settings = window.chartSettings || getChartSettings();
    
    // 如果图表已存在，只更新数据而不重新创建
    if (window.powerChart) {
        updateChartDatasets(curveData, originalPoints, modelParams, outliers, settings);
    } else {
        // 首次创建图表
        createNewChart(ctx, curveData, originalPoints, modelParams, outliers, settings);
    }
}

/**
 * 更新图表数据集，而不重新创建图表
 * @param {Array} curveData - 功率曲线数据
 * @param {Array} originalPoints - 原始数据点
 * @param {Object} modelParams - 模型参数，包含cp和pmax
 * @param {Array} outliers - 异常值数据点
 * @param {Object} settings - 图表设置
 */
function updateChartDatasets(curveData, originalPoints, modelParams, outliers, settings) {
    const chart = window.powerChart;
    if (!chart) return;
    
    // 禁用所有动画
    chart.options.animation = false;
    chart.options.transitions = {
        active: {
            animation: {
                duration: 0
            }
        }
    };
    
    // 过滤非整数时间点（如果需要）
    let filteredCurveData = curveData;
    if (!settings.showNonIntegerTime) {
        filteredCurveData = curveData.filter(point => Number.isInteger(point.time));
    }
    
    // 更新拟合曲线数据（始终保留）
    chart.data.datasets[0].data = filteredCurveData.map(point => ({
        x: point.time,
        y: point.power
    }));
    
    // 更新CP线数据（始终保留）
    chart.data.datasets[1].data = [
        { x: 1, y: modelParams.cp },
        { x: 3600, y: modelParams.cp }
    ];
    
    // 检查原始数据点数据集是否存在
    if (chart.data.datasets.length > 2) {
        // 原始数据集存在，更新或隐藏
        if (settings.showOriginalData) {
            chart.data.datasets[2].data = originalPoints;
            chart.data.datasets[2].hidden = false;
        } else {
            chart.data.datasets[2].hidden = true;
        }
        
        // 检查异常值数据集是否存在
        if (chart.data.datasets.length > 3) {
            // 异常值数据集存在，更新或隐藏
            if (settings.showOriginalData && settings.showOutliers) {
                const outlierData = outliers.map(point => ({
                    x: point.time,
                    y: point.power
                }));
                chart.data.datasets[3].data = outlierData;
                chart.data.datasets[3].hidden = false;
            } else {
                chart.data.datasets[3].hidden = true;
            }
        } else if (settings.showOriginalData && settings.showOutliers && outliers.length > 0) {
            // 需要添加异常值数据集
            const outlierData = outliers.map(point => ({
                x: point.time,
                y: point.power
            }));
            chart.data.datasets.push({
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
            });
        }
    } else {
        // 需要添加原始数据点数据集
        if (settings.showOriginalData) {
            chart.data.datasets.push({
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
            });
            
            // 如果需要，添加异常值数据集
            if (settings.showOutliers && outliers.length > 0) {
                const outlierData = outliers.map(point => ({
                    x: point.time,
                    y: point.power
                }));
                chart.data.datasets.push({
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
                });
            }
        }
    }
    
    // 更新结果显示插件的数据
    chart.options.plugins.customResultsDisplay.cpValue = modelParams.cp;
    chart.options.plugins.customResultsDisplay.pmaxValue = modelParams.pmax;
    
    // 应用更新，不使用动画
    chart.update('none');
}

/**
 * 创建新的图表实例
 * @param {CanvasRenderingContext2D} ctx - Canvas上下文
 * @param {Array} curveData - 功率曲线数据
 * @param {Array} originalPoints - 原始数据点
 * @param {Object} modelParams - 模型参数，包含cp和pmax
 * @param {Array} outliers - 异常值数据点
 * @param {Object} settings - 图表设置
 */
function createNewChart(ctx, curveData, originalPoints, modelParams, outliers, settings) {
    let filteredCurveData = curveData;
    if (!settings.showNonIntegerTime) {
        filteredCurveData = curveData.filter(point => Number.isInteger(point.time));
    }
    
    // 转换曲线数据为适合图表显示的格式
    const chartData = filteredCurveData.map(point => ({
        x: point.time,
        y: point.power
    }));
    
    // 转换异常值数据为适合图表显示的格式
    const outlierData = (outliers && settings.showOutliers && settings.showOriginalData) ? outliers.map(point => ({
        x: point.time,
        y: point.power
    })) : [];
    
    // 获取模型参数
    const cpValue = modelParams.cp;
    const pmaxValue = modelParams.pmax;

    // 添加CP渐近线数据
    const cpLineData = [
        { x: 1, y: cpValue },
        { x: 3600, y: cpValue }
    ];

    // 准备数据集
    const datasets = [
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
            label: '临界功率 (CP)',
            data: cpLineData,
            borderColor: 'rgb(0, 0, 0)',
            borderWidth: 2,
            borderDash: [6, 4],
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
    ];
    
    // 根据设置添加原始数据和异常值
    if (settings.showOriginalData) {
        datasets.push({
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
        });
        
        if (settings.showOutliers && outlierData.length > 0) {
            datasets.push({
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
            });
        }
    }

    // 创建新的Chart实例并保存到全局变量
    window.powerChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            // animation: false, // 禁用所有动画
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
                
                ctx.fillStyle = 'rgba(255, 255, 255, 0)';
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