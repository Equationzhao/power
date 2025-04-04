import { getInfoContent } from './infoContent.js';

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('powerForm');
    const addPointBtn = document.getElementById('addPoint');
    const pointsContainer = document.getElementById('pointsContainer');
    const resultsContent = document.getElementById('resultsContent');
    const useExampleDataBtn = document.getElementById('useExampleData');
    const calculateBtn = document.getElementById('calculate');

    // 从本地存储加载数据
    loadFromLocalStorage();

    // 初始添加3个空白数据点行（如果没有从本地存储恢复数据）
    if (pointsContainer.children.length === 0) {
        addPointRow();
        addPointRow();
        addPointRow();
    }

    // 添加数据点行
    addPointBtn.addEventListener('click', function() {
        addPointRow();
        saveToLocalStorage();
    });

    // 删除数据点行的处理逻辑
    pointsContainer.addEventListener('click', function(e) {
        if (e.target.classList.contains('remove-btn') && !e.target.classList.contains('disabled')) {
            e.target.closest('.point-row').remove();
            updateRemoveButtons();
            saveToLocalStorage();
        }
    });

    // 监听输入变化以保存表单数据
    pointsContainer.addEventListener('input', function() {
        saveToLocalStorage();
    });

    // 监听体重和运行次数变化
    document.getElementById('weight').addEventListener('input', saveToLocalStorage);
    document.getElementById('runtimes').addEventListener('input', saveToLocalStorage);

    // 使用示例数据
    useExampleDataBtn.addEventListener('click', function() {
        const exampleData = [
            {Time: 100, Power: 446},
            {Time: 172, Power: 385},
            {Time: 434, Power: 324},
            {Time: 857, Power: 290},
            {Time: 1361, Power: 280},
        ];

        // 清除现有行
        pointsContainer.innerHTML = '';

        // 添加示例数据行
        exampleData.forEach(data => {
            const row = createPointRow();
            const timeInput = row.querySelector('.time-input');
            const powerInput = row.querySelector('.power-input');
            timeInput.value = data.Time;
            powerInput.value = data.Power;
            pointsContainer.appendChild(row);
        });

        // 设置默认运行次数和体重
        document.getElementById('runtimes').value = 100000;
        document.getElementById('weight').value = 70;

        // 更新删除按钮状态
        updateRemoveButtons();
        
        // 保存到本地存储
        saveToLocalStorage();
    });

    // 表单提交
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // 收集数据
        const pointRows = document.querySelectorAll('.point-row');
        const points = [];

        // 验证数据
        let isValid = true;
        pointRows.forEach(row => {
            const timeInput = row.querySelector('.time-input');
            const powerInput = row.querySelector('.power-input');
            
            const time = Number(timeInput.value);
            const power = Number(powerInput.value);
            
            if (!time || time <= 0 || !power || power <= 0) {
                isValid = false;
                timeInput.style.borderColor = (!time || time <= 0) ? 'red' : '';
                powerInput.style.borderColor = (!power || power <= 0) ? 'red' : '';
            } else {
                points.push({
                    time: time,
                    power: power
                });
                
                // 重置边框颜色
                timeInput.style.borderColor = '';
                powerInput.style.borderColor = '';
            }
        });
        
        if (!isValid) {
            return;
        }
        
        if (points.length < 3) {
            const errorMsg = document.createElement('div');
            errorMsg.className = 'error-message';
            errorMsg.textContent = '错误：至少需要3个数据点来拟合模型';
            errorMsg.style.color = 'var(--secondary-color)';
            errorMsg.style.marginTop = '10px';
            errorMsg.style.marginBottom = '10px';
            errorMsg.style.fontWeight = 'bold';
            
            const warningElement = document.querySelector('.min-points-warning');
            if (warningElement) {
                warningElement.replaceWith(errorMsg);
                setTimeout(() => {
                    errorMsg.replaceWith(warningElement);
                }, 3000);
            } else {
                document.querySelector('.power-points').appendChild(errorMsg);
                setTimeout(() => {
                    errorMsg.remove();
                }, 3000);
            }
            return;
        }
        
        const runtimes = Number(document.getElementById('runtimes').value) || 10000;
        const weight = Number(document.getElementById('weight').value) || 0;
        
        // 构建请求数据
        const requestData = {
            pt: points,
            runtimes: runtimes,
            weight: weight
        };
        
        // 显示计算中状态
        calculateBtn.innerHTML = '计算中...';
        calculateBtn.disabled = true;
        
        // 检查是否已经有结果显示，如果有则添加蒙版而不是重置内容
        const hasExistingResults = resultsContent.querySelector('.result-group') !== null;
        
        if (hasExistingResults) {
            // 创建蒙版和加载指示器
            const overlay = document.createElement('div');
            overlay.className = 'results-overlay';
            overlay.innerHTML = `
                <div class="loading-spinner"></div>
                <div class="loading-text">计算中...</div>
            `;
            
            // 添加蒙版样式
            overlay.style.position = 'absolute';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.69)';
            overlay.style.display = 'flex';
            overlay.style.flexDirection = 'column';
            overlay.style.justifyContent = 'center';
            overlay.style.alignItems = 'center';
            overlay.style.zIndex = '10';
            
            // 添加加载转圈样式
            const style = document.createElement('style');
            if (!document.querySelector('style#loading-spinner-style')) {
                style.id = 'loading-spinner-style';
                style.textContent = `
                    .loading-spinner {
                        width: 50px;
                        height: 50px;
                        border: 5px solid rgba(0, 0, 0, 0.1);
                        border-radius: 50%;
                        border-top-color: var(--primary-color);
                        animation: spin 1s ease-in-out infinite;
                        margin-bottom: 15px;
                    }
                    
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                    
                    .loading-text {
                        font-size: 18px;
                        color: var(--text-color);
                        font-weight: bold;
                    }
                    
                    .results-overlay {
                        opacity: 0;
                        transition: opacity 0.3s ease;
                    }
                    
                    .results-overlay.show {
                        opacity: 1;
                    }
                `;
                document.head.appendChild(style);
            }
            
            // 设置结果容器为相对定位，以便蒙版可以正确定位
            resultsContent.style.position = 'relative';
            resultsContent.appendChild(overlay);
            
            // 淡入蒙版
            setTimeout(() => {
                overlay.classList.add('show');
            }, 10);
        } else {
            // 如果没有已存在的结果，则显示计算中的提示
            resultsContent.innerHTML = '<p class="calculating">正在计算，请稍候...</p>';
        }
        
        // 发送到API
        fetch('/calculate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.error || '请求失败');
                });
            }
            return response.json();
        })
        .then(data => {
            // 移除蒙版（如果存在）
            const overlay = resultsContent.querySelector('.results-overlay');
            if (overlay) {
                overlay.classList.remove('show');
                setTimeout(() => overlay.remove(), 300);
            }
            
            // 显示结果
            displayResults(data);
            
            // 保存结果到本地存储
            saveResultsToLocalStorage(data);
        })
        .catch(error => {
            resultsContent.innerHTML = `
                <div class="error-message">
                    <p>错误: ${error.message}</p>
                </div>
            `;
        })
        .finally(() => {
            // 恢复按钮文本和状态
            calculateBtn.innerHTML = '计算模型';
            calculateBtn.disabled = false;
        });
    });
    
    // 重置按钮行为
    form.addEventListener('reset', function() {
        // 重置结果显示
        resultsContent.innerHTML = '<p class="placeholder">请输入数据</p>';
        
        // 清除所有数据点行并添加一个空行
        pointsContainer.innerHTML = '';
        addPointRow();
        addPointRow();
        addPointRow();
        
        // 清除本地存储
        clearLocalStorage();
    });

    // 创建数据点行
    function createPointRow() {
        const row = document.createElement('div');
        row.className = 'point-row';
        row.innerHTML = `
            <label>时间 (秒):</label>
            <input type="number" class="time-input" min="0.1" step="any">
            <label>功率 (瓦):</label>
            <input type="number" class="power-input" min="0.1" step="any">
            <button type="button" class="remove-btn" title="移除此数据点">
                ✕
                <span class="tooltip">至少需要3个数据点</span>
            </button>
        `;
        return row;
    }

    // 添加数据点行
    function addPointRow() {
        const row = createPointRow();
        pointsContainer.appendChild(row);
        updateRemoveButtons();
    }

    // 更新删除按钮的显示状态
    function updateRemoveButtons() {
        const rows = pointsContainer.querySelectorAll('.point-row');
        
        if (rows.length <= 3) {
            // 少于等于3个数据点时，禁用(置灰)所有删除按钮
            rows.forEach(row => {
                const removeBtn = row.querySelector('.remove-btn');
                removeBtn.classList.add('disabled');
                removeBtn.setAttribute('title', '最少需要3个数据点才能拟合模型'); // 移除原本的title，因为我们使用自定义tooltip
            });
        } else {
            // 超过3个数据点时，启用所有删除按钮
            rows.forEach(row => {
                const removeBtn = row.querySelector('.remove-btn');
                removeBtn.classList.remove('disabled');
            });
        }
        
        // 如果数据点少于3个，提醒用户
        if (rows.length < 3) {
            // 添加一个提示，最少需要3个数据点
            const warningElement = document.querySelector('.min-points-warning') || document.createElement('div');
            warningElement.className = 'min-points-warning';
            warningElement.textContent = '注意：最少需要3个数据点才能拟合模型';
            warningElement.style.color = 'var(--secondary-color)';
            warningElement.style.fontSize = '12px';
            warningElement.style.marginTop = '5px';
            
            if (!document.querySelector('.min-points-warning')) {
                document.querySelector('.power-points').appendChild(warningElement);
            }
        } else {
            // 移除警告提示
            const warning = document.querySelector('.min-points-warning');
            if (warning) {
                warning.remove();
            }
        }
    }

    // 保存表单数据到本地存储
    function saveToLocalStorage() {
        const formData = {
            points: [],
            weight: document.getElementById('weight').value,
            runtimes: document.getElementById('runtimes').value
        };
        
        // 收集所有数据点
        const pointRows = document.querySelectorAll('.point-row');
        pointRows.forEach(row => {
            const timeInput = row.querySelector('.time-input').value;
            const powerInput = row.querySelector('.power-input').value;
            formData.points.push({
                time: timeInput,
                power: powerInput
            });
        });
        
        localStorage.setItem('powerFormData', JSON.stringify(formData));
    }
    
    // 保存计算结果到本地存储
    function saveResultsToLocalStorage(data) {
        localStorage.setItem('powerResults', JSON.stringify(data));
    }
    
    // 从本地存储加载数据
    function loadFromLocalStorage() {
        try {
            // 加载表单数据
            const formDataJson = localStorage.getItem('powerFormData');
            if (formDataJson) {
                const formData = JSON.parse(formDataJson);
                
                // 设置体重和运行次数
                if (formData.weight) document.getElementById('weight').value = formData.weight;
                if (formData.runtimes) document.getElementById('runtimes').value = formData.runtimes;
                
                // 添加数据点行
                if (formData.points && formData.points.length > 0) {
                    // 清空容器
                    pointsContainer.innerHTML = '';
                    
                    // 添加保存的数据点
                    formData.points.forEach(point => {
                        const row = createPointRow();
                        const timeInput = row.querySelector('.time-input');
                        const powerInput = row.querySelector('.power-input');
                        
                        if (point.time) timeInput.value = point.time;
                        if (point.power) powerInput.value = point.power;
                        
                        pointsContainer.appendChild(row);
                    });
                    
                    // 更新删除按钮状态
                    updateRemoveButtons();
                }
            }
            
            // 加载计算结果
            const resultsJson = localStorage.getItem('powerResults');
            if (resultsJson) {
                const results = JSON.parse(resultsJson);
                displayResults(results);
            }
        } catch (error) {
            console.error('从本地存储加载数据时出错:', error);
            // 出错时清除本地存储，防止持续错误
            clearLocalStorage();
        }
    }
    
    // 清除本地存储
    function clearLocalStorage() {
        localStorage.removeItem('powerFormData');
        localStorage.removeItem('powerResults');
    }

    // 显示结果
    function displayResults(data) {
        const weight = Number(document.getElementById('weight').value) || 0;
        const hasWeight = weight > 0;
        
        // 基本参数结果
        let resultsHTML = `
            <div class="result-group">
                <div><span class="result-label info-trigger" data-info="cp">临界功率 (CP):</span> <span class="value " data-info="cp">${data.cp.toFixed(1)}</span> <span class="unit">瓦</span></div>
                ${hasWeight ? `<div><span class="result-label info-trigger" data-info="cp_per_kg">功体比 (PWR):</span> <span class="value " data-info="cp_per_kg">${(data.cp/weight).toFixed(2)}</span> <span class="unit">W/kg</span></div>` : ''}
                <div><span class="result-label info-trigger" data-info="wprime">无氧储备 (Anaerobic Reserve, W'):</span> <span class="value " data-info="wprime">${data.wprime.toFixed(0)}</span> <span class="unit">焦</span></div>
                <div><span class="result-label info-trigger" data-info="pmax">最大瞬时功率 (Pmax):</span> <span class="value " data-info="pmax">${data.pmax.toFixed(1)}</span> <span class="unit">瓦</span></div>
                <div><span class="result-label info-trigger" data-info="tau">时间常数 (Tau):</span> <span class="value " data-info="tau">${data.tau.toFixed(2)}</span> <span class="unit">秒</span></div>
                <div><span class="result-label info-trigger" data-info="rmse">拟合误差 (RMSE):</span> <span class="value " data-info="rmse">${data.rmse.toFixed(2)}</span></div>
            </div>`;
            
        // VO2Max 结果（如果有）
        if (data.vo2max) {
            resultsHTML += `
            <div class="result-group">
                <div><span class="result-label info-trigger" data-info="vo2max">最大摄氧量 (VO2Max):</span> <span class="value " data-info="vo2max">${data.vo2max.toFixed(1)}</span> <span class="unit">ml/kg/min</span></div>
            </div>`;
        }
        
        // 训练区间表格
        if (data.training_zones) {
            resultsHTML += `
            <div class="result-group">
                <h3 class="zones-title info-trigger" data-info="zones">训练区间</h3>
                <table class="zones-table">
                    <thead>
                        <tr>
                            <th>区间名称</th>
                            <th>下限 (W)</th>
                            <th>上限 (W)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><span class="zone-text recovery-text info-trigger" data-info="recovery">恢复区间</span></td>
                            <td>${data.training_zones.recovery_zone.min.toFixed(0)}</td>
                            <td>${data.training_zones.recovery_zone.max.toFixed(0)}</td>
                        </tr>
                        <tr>
                            <td><span class="zone-text endurance-text info-trigger" data-info="endurance">耐力区间</span></td>
                            <td>${data.training_zones.endurance_zone.min.toFixed(0)}</td>
                            <td>${data.training_zones.endurance_zone.max.toFixed(0)}</td>
                        </tr>
                        <tr>
                            <td><span class="zone-text tempo-text info-trigger" data-info="tempo">节奏区间</span></td>
                            <td>${data.training_zones.tempo_zone.min.toFixed(0)}</td>
                            <td>${data.training_zones.tempo_zone.max.toFixed(0)}</td>
                        </tr>
                        <tr>
                            <td><span class="zone-text threshold-text info-trigger" data-info="threshold">阈值区间</span></td>
                            <td>${data.training_zones.threshold_zone.min.toFixed(0)}</td>
                            <td>${data.training_zones.threshold_zone.max.toFixed(0)}</td>
                        </tr>
                        <tr>
                            <td><span class="zone-text vo2max-text info-trigger" data-info="vo2max_zone">VO2Max区间</span></td>
                            <td>${data.training_zones.vo2max_zone.min.toFixed(0)}</td>
                            <td>${data.training_zones.vo2max_zone.max.toFixed(0)}</td>
                        </tr>
                        <tr>
                            <td><span class="zone-text anaerobic-text info-trigger" data-info="anaerobic">无氧区间</span></td>
                            <td>${data.training_zones.anaerobic_zone.min.toFixed(0)}</td>
                            <td>${data.training_zones.anaerobic_zone.max.toFixed(0)}</td>
                        </tr>
                        <tr>
                            <td><span class="zone-text neuromuscular-text info-trigger" data-info="neuromuscular">神经肌肉区间</span></td>
                            <td>${data.training_zones.neuromuscular_zone.min.toFixed(0)}</td>
                            <td>${data.training_zones.neuromuscular_zone.max.toFixed(0)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>`;
        }
        
        resultsHTML += `
        <div class="result-group">
            <button id="showPowerTimeCurve" class="primary-btn">查看功率曲线</button>
        </div>`;
        
        resultsContent.innerHTML = resultsHTML;
        
        window.calculatedData = data;
        
        document.getElementById('showPowerTimeCurve').addEventListener('click', function() {
            showPowerTimeCurvePopup(data.power_time_curve);
        });
        
        // 添加弹窗点击事件监听
        setupInfoPopups();
    }

    // 显示功率-时间曲线弹窗
    function showPowerTimeCurvePopup(curveData) {
        const existingPopup = document.querySelector('.info-popup');
        if (existingPopup) {
            return
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

        // 绘制图表 - 为X轴使用对数刻度以更好地显示曲线形状
        const ctx = document.getElementById('powerTimeCurveChart').getContext('2d');
        
        // 转换曲线数据为适合图表显示的格式
        const chartData = curveData.map(point => ({
            x: point.time,
            y: point.power
        }));
        
        // 获取用户输入的原始数据点
        const originalPoints = collectPowerTimePoints().map(point => ({
            x: point.time,
            y: point.power
        }));

        // 添加CP渐近线数据
        const cpValue = window.calculatedData.cp;
        const cpLineData = [
            { x: 1, y: cpValue },    // 从1秒开始(对数轴的最小值)
            { x: 3600, y: cpValue }  // 到3600秒(1小时)结束
        ];

        const pmaxValue = window.calculatedData.pmax;

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

    // 收集功率-时间数据点
    function collectPowerTimePoints() {
        const points = [];
        const pointRows = document.querySelectorAll('.point-row');
        pointRows.forEach(row => {
            const timeInput = row.querySelector('.time-input').value;
            const powerInput = row.querySelector('.power-input').value;
            if (timeInput && powerInput) {
                points.push({
                    time: Number(timeInput),
                    power: Number(powerInput)
                });
            }
        });
        return points;
    }

    // 设置信息弹窗触发器
    function setupInfoPopups() {
        const infoTriggers = document.querySelectorAll('.info-trigger');
        
        infoTriggers.forEach(trigger => {
            trigger.addEventListener('click', function() {
                const infoType = this.getAttribute('data-info');
                showInfoPopup(infoType);
            });
        });
    }

    // 显示信息弹窗
    function showInfoPopup(infoType) {
        // 清除任何可能存在的弹窗
        const existingPopup = document.querySelector('.info-popup');
        if (existingPopup) {
            existingPopup.remove();
        }
        
        // 创建新弹窗
        const popup = document.createElement('div');
        popup.className = 'info-popup';
        
        // 设置弹窗内容
        const content = getInfoContent(infoType);
        popup.innerHTML = `
            <div class="info-popup-header">
                <h3>${content.title}</h3>
                <button class="info-popup-close">&times;</button>
            </div>
            <div class="info-popup-content">
                ${content.body}
            </div>
        `;
        
        // 添加弹窗到文档
        document.body.appendChild(popup);
        
        // 弹窗关闭事件
        popup.querySelector('.info-popup-close').addEventListener('click', function() {
            popup.remove();
        });
        
        // 点击弹窗外部关闭
        document.addEventListener('click', function closePopup(e) {
            if (!popup.contains(e.target) && !e.target.classList.contains('info-trigger')) {
                popup.remove();
                document.removeEventListener('click', closePopup);
            }
        });
        
        // 渐入显示
        setTimeout(() => {
            popup.classList.add('show');
        }, 10);
    }
});
