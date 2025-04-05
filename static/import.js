import { createPointRow, saveToLocalStorage, updateRemoveButtons } from "./util.js";

// 设置CSV导入功能
function setupCsvImport() {
    const importCsvBtn = document.getElementById('importCsvBtn');
    const csvFileInput = document.getElementById('csvFileInput');

    // 点击导入按钮时触发文件选择
    importCsvBtn.addEventListener('click', function () {
        csvFileInput.click();
    });

    // 处理文件选择
    csvFileInput.addEventListener('change', function (e) {
        if (this.files && this.files[0]) {
            const file = this.files[0];

            // 检查文件类型
            if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
                alert('请选择CSV文件');
                return;
            }

            const reader = new FileReader();

            reader.onload = function (event) {
                try {
                    // 解析CSV文件内容
                    const csvData = parseCSV(event.target.result);

                    // 用CSV数据填充表单
                    fillFormWithCsvData(csvData);

                    // 保存到本地存储
                    saveToLocalStorage();
                } catch (error) {
                    alert('解析CSV文件时出错: ' + error.message);
                    console.error('CSV解析错误:', error);
                }
            };

            reader.onerror = function () {
                alert('读取文件时出错，请重试');
            };

            reader.readAsText(file);
        }
    });
}

// 解析CSV内容
function parseCSV(csvContent) {
    const result = [];
    const lines = csvContent.split(/\r\n|\n/);

    // 检查是否是空文件
    if (lines.length === 0) {
        throw new Error('CSV文件为空');
    }

    // 处理每一行
    for (let i = 0; i < lines.length; i++) {
        // 跳过空行
        if (lines[i].trim() === '') continue;

        // 检测分隔符，支持逗号和制表符
        let separator = ',';
        if (lines[i].includes('\t')) {
            separator = '\t';
        }

        const columns = lines[i].split(separator);

        // 需要至少两列数据：时间和功率
        if (columns.length < 2) {
            continue; // 跳过格式不正确的行
        }

        const time = parseFloat(columns[0]);
        const power = parseFloat(columns[1]);

        // 验证数据有效性
        if (!isNaN(time) && !isNaN(power) && time > 0 && power > 0) {
            result.push({
                time: time,
                power: power
            });
        }
    }

    // 检查是否解析到有效数据
    if (result.length === 0) {
        throw new Error('CSV文件中没有有效的时间-功率数据对');
    }

    return result;
}

// 用CSV数据填充表单
function fillFormWithCsvData(csvData) {
    // 清除现有数据行
    pointsContainer.innerHTML = '';

    // 添加CSV数据行
    csvData.forEach(data => {
        const row = createPointRow();
        const timeInput = row.querySelector('.time-input');
        const powerInput = row.querySelector('.power-input');
        timeInput.value = data.time;
        powerInput.value = data.power;
        pointsContainer.appendChild(row);
    });

    // 更新删除按钮状态
    updateRemoveButtons();
}

export { setupCsvImport };

