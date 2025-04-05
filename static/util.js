import { collectPowerTimePoints, showPowerTimeCurvePopup } from "./graph.js";
import { getInfoContent } from "./infoContent.js";

// 创建数据点行
function createPointRow() {
	// 创建一个唯一ID以关联label和input
	const timeId = "time-" + Math.random().toString(36).substring(2, 11);
	const powerId = "power-" + Math.random().toString(36).substring(2, 11);

	// 创建数据点行DOM元素
	const row = document.createElement("div");
	row.className = "point-row";

	// 添加时间输入
	const timeLabel = document.createElement("label");
	timeLabel.htmlFor = timeId;
	timeLabel.textContent = "时间 (秒):";
	timeLabel.className = "point-label";

	const timeInput = document.createElement("input");
	timeInput.type = "number";
	timeInput.id = timeId;
	timeInput.className = "time-input";
	timeInput.min = "0";
	timeInput.step = "0.1"; // 添加step属性以支持一位小数
	timeInput.placeholder = "秒";

	// 添加功率输入
	const powerLabel = document.createElement("label");
	powerLabel.htmlFor = powerId;
	powerLabel.textContent = "功率 (瓦):";
	powerLabel.className = "point-label";

	const powerInput = document.createElement("input");
	powerInput.type = "number";
	powerInput.id = powerId;
	powerInput.className = "power-input";
	powerInput.min = "0";
	powerInput.step = "0.1"; // 添加step属性以支持一位小数
	powerInput.placeholder = "瓦";

	// 添加删除按钮
	const removeBtn = document.createElement("button");
	removeBtn.type = "button";
	removeBtn.className = "remove-btn";
	removeBtn.innerHTML = "×";
	removeBtn.setAttribute("title", "删除此数据点");

	// 组装行
	row.appendChild(timeLabel);
	row.appendChild(timeInput);
	row.appendChild(powerLabel);
	row.appendChild(powerInput);
	row.appendChild(removeBtn);

	return row;
}

// 显示结果
function displayResults(data) {
	const weight = Number(document.getElementById('weight').value) || 0;
	const hasWeight = weight > 0;

	// 基本参数结果
	let resultsHTML = `
            <div class="result-group">
                <div><span class="result-label info-trigger" data-info="cp">临界功率 (CP):</span> <span class="value " data-info="cp">${data.cp.toFixed(1)}</span> <span class="unit">瓦</span></div>
                ${hasWeight ? `<div><span class="result-label info-trigger" data-info="cp_per_kg">功体比 (PWR):</span> <span class="value " data-info="cp_per_kg">${(data.cp / weight).toFixed(2)}</span> <span class="unit">W/kg</span></div>` : ''}
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

	document.getElementById('showPowerTimeCurve').addEventListener('click', function () {
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
		trigger.addEventListener('click', function () {
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
	popup.querySelector('.info-popup-close').addEventListener('click', function () {
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

// 更新删除按钮的显示状态
function updateRemoveButtons() {
	const pointRows = document.querySelectorAll(".point-row");
	// 当只有一行时禁用删除按钮
	if (pointRows.length <= 3) {
		pointRows.forEach((row) => {
			const btn = row.querySelector(".remove-btn");
			btn.classList.add("disabled");

			// 添加tooltip解释为什么按钮被禁用
			if (!btn.querySelector(".tooltip")) {
				const tooltip = document.createElement("span");
				tooltip.className = "tooltip";
				tooltip.textContent = "至少需要3个数据点";
				btn.appendChild(tooltip);
			}
		});
	} else {
		pointRows.forEach((row) => {
			const btn = row.querySelector(".remove-btn");
			btn.classList.remove("disabled");
		});
	}
}

// 保存表单数据到本地存储
function saveToLocalStorage() {
	const pointRows = document.querySelectorAll(".point-row");
	const data = [];

	// 收集每行数据
	pointRows.forEach((row) => {
		const timeInput = row.querySelector(".time-input");
		const powerInput = row.querySelector(".power-input");

		if (timeInput && powerInput) {
			data.push({
				time: timeInput.value,
				power: powerInput.value,
			});
		}
	});

	// 获取体重和运行次数
	const weight = document.getElementById("weight").value;
	const runtimes = document.getElementById("runtimes").value;
	const outlierDetect = document.getElementById("outlierDetect").checked;

	// 保存到本地存储
	localStorage.setItem(
		"powerFormData",
		JSON.stringify({
			points: data,
			weight: weight,
			runtimes: runtimes,
			outlierDetect: outlierDetect,
		})
	);
}

// 从本地存储加载数据
function loadFromLocalStorage() {
	try {
		// 加载表单数据
		const formDataJson = localStorage.getItem("powerFormData");
		if (formDataJson) {
			const formData = JSON.parse(formDataJson);

			// 设置体重和运行次数
			if (formData.weight)
				document.getElementById("weight").value = formData.weight;
			if (formData.runtimes) {
				document.getElementById("runtimes").value = formData.runtimes;
			}

			// 设置异常值检测开关状态
			if (formData.outlierDetect !== undefined) {
				document.getElementById("outlierDetect").checked =
					formData.outlierDetect;
			}

			// 添加数据点行
			if (formData.points && formData.points.length > 0) {
				// 清空容器
				pointsContainer.innerHTML = "";

				// 添加保存的数据点
				formData.points.forEach((point) => {
					const row = createPointRow();
					const timeInput = row.querySelector(".time-input");
					const powerInput = row.querySelector(".power-input");

					if (point.time) timeInput.value = point.time;
					if (point.power) powerInput.value = point.power;

					pointsContainer.appendChild(row);
				});

				// 更新删除按钮状态
				updateRemoveButtons();
			}
		}

		// 加载计算结果
		const resultsJson = localStorage.getItem("powerResults");
		if (resultsJson) {
			const results = JSON.parse(resultsJson);
			displayResults(results);
		}
	} catch (error) {
		console.error("从本地存储加载数据时出错:", error);
		// 出错时清除本地存储，防止持续错误
		clearLocalStorage();
	}
}

// 清除本地存储
function clearLocalStorage() {
	localStorage.removeItem("powerFormData");
	localStorage.removeItem("powerResults");
}

function addPointRow() {
	const row = createPointRow();
	pointsContainer.appendChild(row);
	updateRemoveButtons();
	return row;
}

export {
	addPointRow,
	clearLocalStorage,
	createPointRow, displayResults, loadFromLocalStorage,
	saveToLocalStorage,
	updateRemoveButtons
};

