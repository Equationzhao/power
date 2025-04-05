// 创建数据点行
function createPointRow() {
    // 创建一个唯一ID以关联label和input
    const timeId = 'time-' + Math.random().toString(36).substr(2, 9);
    const powerId = 'power-' + Math.random().toString(36).substr(2, 9);
    
    const row = document.createElement('div');
    row.className = 'point-row';
    row.innerHTML = `
        <label for="${timeId}">时间 (秒):</label>
        <input type="number" id="${timeId}" name="${timeId}" class="time-input" min="0.1" step="any">
        <label for="${powerId}">功率 (瓦):</label>
        <input type="number" id="${powerId}" name="${powerId}" class="power-input" min="0.1" step="any">
        <button type="button" class="remove-btn">
            ✕
            <span class="tooltip">至少需要3个数据点</span>
        </button>
    `;
    const tooltip = row.querySelector('.tooltip');
    if (tooltip) {
        tooltip.style.position = 'fixed';
        tooltip.style.padding = '8px 8px';
        tooltip.style.whiteSpace = 'nowrap';
        tooltip.style.height = '30px';
        
        const removeBtn = row.querySelector('.remove-btn');
        if (removeBtn) {
            removeBtn.addEventListener('mouseenter', function(e) {
                if (this.classList.contains('disabled')) {
                    const rect = this.getBoundingClientRect();
                    tooltip.style.left = (rect.left + rect.width/2) + 'px';
                    tooltip.style.top = (rect.top - 20) + 'px';
                    tooltip.style.transform = 'translateX(-50%)';
                    tooltip.style.visibility = 'visible';
                    tooltip.style.opacity = '1';
                    tooltip.style.zIndex = '1000';
                }
            });
            
            removeBtn.addEventListener('mouseleave', function() {
                tooltip.style.visibility = 'hidden';
                tooltip.style.opacity = '0';
            });
        }
    }
    return row;
}


// 更新删除按钮的显示状态
function updateRemoveButtons() {
    const rows = pointsContainer.querySelectorAll('.point-row');
    
    if (rows.length <= 3) {
        // 少于等于3个数据点时，禁用(置灰)所有删除按钮
        rows.forEach(row => {
            const removeBtn = row.querySelector('.remove-btn');
            removeBtn.classList.add('disabled');
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
        runtimes: document.getElementById('runtimes').value,
        outlierDetect: document.getElementById('outlierDetect').checked
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

export { createPointRow, saveToLocalStorage, updateRemoveButtons };

