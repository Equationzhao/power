import { collectPowerTimePoints, showPowerTimeCurvePopup } from './graph.js';
import { setupCsvImport } from './import.js';
import { getInfoContent } from './infoContent.js';
import { createPointRow, saveToLocalStorage, updateRemoveButtons } from "./util.js";

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('powerForm');
    const addPointBtn = document.getElementById('addPoint');
    const pointsContainer = document.getElementById('pointsContainer');
    const resultsContent = document.getElementById('resultsContent');
    const useExampleDataBtn = document.getElementById('useExampleData');
    const calculateBtn = document.getElementById('calculate');
    
    // 添加请求状态跟踪变量
    let requestActive = false;
    let requestCancelled = false;

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
    
    // 监听异常值检测开关变化
    document.getElementById('outlierDetect').addEventListener('change', saveToLocalStorage);

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
        
        // 重置请求状态标记
        requestCancelled = false;
        requestActive = true;
        
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
        const outlierDetect = document.getElementById('outlierDetect').checked;
        
        // 构建请求数据
        const requestData = {
            pt: points,
            runtimes: runtimes,
            weight: weight,
            outlier_detect: outlierDetect
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
            // 检查请求是否已被取消
            if (requestCancelled) {
                console.log('请求已被取消，忽略返回的数据');
                requestActive = false;
                return;
            }
            
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
            
            // 重置请求状态
            requestActive = false;
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
        // 标记当前请求需要被取消
        if (requestActive) {
            requestCancelled = true;
        }
        
        // 重置结果显示
        resultsContent.innerHTML = '<p class="placeholder">请输入数据</p>';
        
        // 移除可能存在的蒙版
        const overlay = resultsContent.querySelector('.results-overlay');
        if (overlay) {
            overlay.remove();
        }
        
        // 清除所有数据点行并添加一个空行
        pointsContainer.innerHTML = '';
        addPointRow();
        addPointRow();
        addPointRow();
        
        // 清除本地存储
        clearLocalStorage();
        
        // 确保计算按钮可用
        calculateBtn.disabled = false;
        calculateBtn.innerHTML = '计算模型';
    });


    // 添加数据点行
    function addPointRow() {
        const row = createPointRow();
        pointsContainer.appendChild(row);
        updateRemoveButtons();
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
                
                // 设置异常值检测开关状态
                if (formData.outlierDetect !== undefined) {
                    document.getElementById('outlierDetect').checked = formData.outlierDetect;
                }
                
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
                <div><span class="result-label info-trigger" data-info="vo2max">最大摄氧量 (VO₂Max):</span> <span class="value " data-info="vo2max">${data.vo2max.toFixed(1)}</span> <span class="unit">ml/kg/min</span></div>
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
                            <td><span class="zone-text vo2max-text info-trigger" data-info="vo2max_zone">VO₂Max区间</span></td>
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
            <button id="showPowerTimeCurve" class="btn btn-primary">查看功率曲线</button>
        </div>`;
        
        resultsContent.innerHTML = resultsHTML;
        
        window.calculatedData = data;
        
        document.getElementById('showPowerTimeCurve').addEventListener('click', function() {
            const originalPoints = collectPowerTimePoints();
            const modelParams = {
                cp: data.cp,
                pmax: data.pmax
            };
            // 传递异常值数据
            showPowerTimeCurvePopup(data.power_time_curve, originalPoints, modelParams, data.outliers);
        });
        
        // 添加弹窗点击事件监听
        setupInfoPopups();
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

    // 设置CSV导入功能
    setupCsvImport();

});
