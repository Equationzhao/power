import { setupCsvImport } from './import.js';
import { clearLocalStorage, createPointRow, displayResults, loadFromLocalStorage, saveToLocalStorage, updateRemoveButtons } from "./util.js";

document.addEventListener('DOMContentLoaded', function () {
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
    addPointBtn.addEventListener('click', function () {
        addPointRow();
        saveToLocalStorage();
    });

    // 删除数据点行的处理逻辑
    pointsContainer.addEventListener('click', function (e) {
        if (e.target.classList.contains('remove-btn') && !e.target.classList.contains('disabled')) {
            e.target.closest('.point-row').remove();
            updateRemoveButtons();
            saveToLocalStorage();
        }
    });

    // 监听输入变化以保存表单数据
    pointsContainer.addEventListener('input', function () {
        saveToLocalStorage();
    });

    // 监听体重和运行次数变化
    document.getElementById('weight').addEventListener('input', saveToLocalStorage);
    document.getElementById('runtimes').addEventListener('input', saveToLocalStorage);

    // 监听异常值检测开关变化
    document.getElementById('outlierDetect').addEventListener('change', saveToLocalStorage);

    // 使用示例数据
    useExampleDataBtn.addEventListener('click', function () {
        const exampleData = [
            { Time: 1, Power: 768 },
            { Time: 5, Power: 697 },
            { Time: 30, Power: 482 },
            { Time: 60, Power: 337 },
            { Time: 300, Power: 259 },
            { Time: 600, Power: 236 },
            { Time: 1200, Power: 233 },
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
    form.addEventListener('submit', function (e) {
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
    form.addEventListener('reset', function (e) {
        // 阻止默认的重置行为，先显示确认对话框
        e.preventDefault();
        
        // 使用 SweetAlert2 创建一个样式化的确认对话框
        const swalWithCustomButtons = Swal.mixin({
			customClass: {
				confirmButton: "btn btn-success swal-confirm-button",
				cancelButton: "btn btn-danger swal-cancel-button",
				actions: "swal-buttons-container"
			},
			buttonsStyling: false
		});
		
		// 添加自定义样式到页面
		if (!document.querySelector('style#swal-custom-style')) {
			const style = document.createElement('style');
			style.id = 'swal-custom-style';
			style.textContent = `
				.swal-buttons-container {
					gap: 20px;
					justify-content: center;
				}
				.swal-confirm-button, .swal-cancel-button {
					min-width: 120px;
					margin: 0 10px !important;
				}
			`;
			document.head.appendChild(style);
		}
		
		swalWithCustomButtons.fire({
			title: "确认重置?",
			text: "所有已输入的数据将被清除，且无法恢复!",
			icon: "warning",
			showCancelButton: true,
			confirmButtonText: "是的，清除数据!",
			cancelButtonText: "取消",
			reverseButtons: true
		}).then((result) => {
			if (result.isConfirmed) {
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
				
				// 显示成功消息
				swalWithCustomButtons.fire({
					title: "已重置!",
					text: "所有数据已被清除。",
					icon: "success"
				});
			}
		});
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

    // 设置CSV导入功能
    setupCsvImport();
});
