document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('powerForm');
    const addPointBtn = document.getElementById('addPoint');
    const pointsContainer = document.getElementById('pointsContainer');
    const resultsContent = document.getElementById('resultsContent');
    const useExampleDataBtn = document.getElementById('useExampleData');
    const calculateBtn = document.getElementById('calculate');

    // 初始添加3个空白数据点行
    addPointRow();
    addPointRow();
    addPointRow();

    // 添加数据点行
    addPointBtn.addEventListener('click', addPointRow);

    // 删除数据点行的处理逻辑
    pointsContainer.addEventListener('click', function(e) {
        if (e.target.classList.contains('remove-btn') && !e.target.classList.contains('disabled')) {
            e.target.closest('.point-row').remove();
            updateRemoveButtons();
        }
    });

    // 使用示例数据
    useExampleDataBtn.addEventListener('click', function() {
        const exampleData = [
            {Time: 1, Power: 768},
            {Time: 5, Power: 697},
            {Time: 10, Power: 683},
            {Time: 30, Power: 482},
            {Time: 60, Power: 337},
            {Time: 300, Power: 259},
            {Time: 600, Power: 236},
            {Time: 1200, Power: 233}
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
        document.getElementById('runtimes').value = 10000;
        document.getElementById('weight').value = 70;

        // 更新删除按钮状态
        updateRemoveButtons();
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
            
            if (!time || !power) {
                isValid = false;
                timeInput.style.borderColor = !time ? 'red' : '';
                powerInput.style.borderColor = !power ? 'red' : '';
            } else {
                points.push({
                    Time: time,
                    Power: power
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
        
        // 只禁用提交按钮，而不是所有表单元素
        // 这样可以避免表单元素的闪烁
        
        resultsContent.innerHTML = '<p class="calculating">正在计算，请稍候...</p>';
        
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
            displayResults(data);
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
    });

    // 创建数据点行
    function createPointRow() {
        const row = document.createElement('div');
        row.className = 'point-row';
        row.innerHTML = `
            <label>时间 (秒):</label>
            <input type="number" class="time-input" min="1" step="1">
            <label>功率 (瓦特):</label>
            <input type="number" class="power-input" min="1" step="1">
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

    // 显示结果
    function displayResults(data) {
        // 基本参数结果
        let resultsHTML = `
            <div class="result-group">
                <div><span class="result-label info-trigger" data-info="cp">临界功率 (CP):</span> <span class="value info-trigger" data-info="cp">${data.cp.toFixed(1)}</span> <span class="unit">瓦特</span></div>
                <div><span class="result-label info-trigger" data-info="wprime">无氧工作容量 (W'):</span> <span class="value info-trigger" data-info="wprime">${data.wprime.toFixed(0)}</span> <span class="unit">焦耳</span></div>
                <div><span class="result-label info-trigger" data-info="pmax">最大瞬时功率 (Pmax):</span> <span class="value info-trigger" data-info="pmax">${data.pmax.toFixed(1)}</span> <span class="unit">瓦特</span></div>
                <div><span class="result-label info-trigger" data-info="tau">时间常数 (Tau):</span> <span class="value info-trigger" data-info="tau">${data.tau.toFixed(2)}</span> <span class="unit">秒</span></div>
                <div><span class="result-label info-trigger" data-info="rmse">拟合误差 (RMSE):</span> <span class="value info-trigger" data-info="rmse">${data.rmse.toFixed(2)}</span></div>
            </div>`;
            
        // VO2Max 结果（如果有）
        if (data.vo2max) {
            resultsHTML += `
            <div class="result-group">
                <div><span class="result-label info-trigger" data-info="vo2max">最大摄氧量 (VO2Max):</span> <span class="value info-trigger" data-info="vo2max">${data.vo2max.toFixed(1)}</span> <span class="unit">ml/kg/min</span></div>
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
        
        resultsContent.innerHTML = resultsHTML;
        
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

    // 获取弹窗内容
    function getInfoContent(infoType) {
        const infoContents = {
            cp: {
                title: "临界功率 (CP)",
                body: `
                    <h4>定义：</h4>
                    <p>理论上可以无限期维持的最大功率输出，代表有氧系统的功能性上限。</p>
                    
                    <h4>生理意义：</h4>
                    <ul>
                        <li>接近第二乳酸阈值和最大乳酸稳态(MLSS)</li>
                        <li>表示有氧代谢系统的最大稳定输出能力</li>
                        <li>在此强度下，乳酸产生和清除处于平衡状态</li>
                    </ul>
                    
                    <h4>典型值：</h4>
                    <ul>
                        <li>训练有素的业余骑行者: 3.0-3.7 W/kg</li>
                        <li>高水平业余骑行者: 3.8-4.4 W/kg</li>
                        <li>精英/职业骑行者: 4.5-6.5+ W/kg</li>
                    </ul>
                    
                    <h4>应用：</h4>
                    <ul>
                        <li>确定持续训练和比赛强度</li>
                        <li>预测不同时间段的表现能力</li>
                        <li>比赛策略制定的基础</li>
                    </ul>
                `
            },
            wprime: {
                title: "无氧工作容量 (W')",
                body: `
                    <h4>定义：</h4>
                    <p>运动员在超过临界功率强度时可以完成的总工作量，单位为焦耳(J)或千焦(kJ)。</p>
                    
                    <h4>生理意义：</h4>
                    <ul>
                        <li>代表高强度运动中的有限能量"储备库"</li>
                        <li>与肌糖原、高能磷酸盐(ATP-CP)系统相关</li>
                        <li>受肌肉酸化和代谢物积累的限制</li>
                    </ul>
                    
                    <h4>典型值：</h4>
                    <ul>
                        <li>男性骑行者: 10-25 kJ</li>
                        <li>女性骑行者: 7-20 kJ</li>
                        <li>相对体重表达: 通常在200-350 J/kg</li>
                    </ul>
                    
                    <h4>应用：</h4>
                    <ul>
                        <li>预测超临界功率强度下的持续时间</li>
                        <li>量化高强度间歇训练中的恢复需求</li>
                        <li>W'平衡模型在比赛中监测剩余无氧能量</li>
                    </ul>
                `
            },
            pmax: {
                title: "最大瞬时功率 (Pmax)",
                body: `
                    <h4>定义：</h4>
                    <p>理论上骑行者在瞬间(t→0)能够产生的最大功率输出，三参数模型中的新增参数。</p>
                    
                    <h4>生理意义：</h4>
                    <ul>
                        <li>与神经肌肉系统的最大激活能力相关</li>
                        <li>依赖于快肌纤维比例和肌肉截面积</li>
                        <li>反映高能磷酸盐系统的立即供能能力</li>
                    </ul>
                    
                    <h4>典型值：</h4>
                    <ul>
                        <li>训练有素的业余骑行者: 800-1200W</li>
                        <li>精英骑行者: 1200-1800W</li>
                        <li>世界级冲刺选手: 1800-2400W+</li>
                        <li>相对体重: 业余9-13 W/kg，专业冲刺选手20-26 W/kg</li>
                    </ul>
                    
                    <h4>应用：</h4>
                    <ul>
                        <li>评估冲刺能力</li>
                        <li>识别运动员类型(冲刺型/爬坡型/计时赛型)</li>
                        <li>装备选择参考(齿轮比、曲柄长度)</li>
                    </ul>
                `
            },
            tau: {
                title: "时间常数 (Tau τ)",
                body: `
                    <h4>定义：</h4>
                    <p>描述功率从最大瞬时功率衰减到临界功率的时间特征，单位为秒。</p>
                    
                    <h4>关键特性：</h4>
                    <ul>
                        <li>表达了功率-时间曲线的曲率</li>
                        <li>数学关系: τ = W'/(Pmax-CP)</li>
                        <li>较小的τ表示功率衰减更快，较大的τ表示功率衰减更缓慢</li>
                    </ul>
                    
                    <h4>典型值：</h4>
                    <ul>
                        <li>爆发力型选手: 5-8秒</li>
                        <li>全能型选手: 8-12秒</li>
                        <li>耐力型选手: 12-20秒</li>
                    </ul>
                    
                    <h4>应用：</h4>
                    <ul>
                        <li>运动员类型分类</li>
                        <li>短时间高强度表现预测</li>
                        <li>训练重点确定和个性化</li>
                    </ul>
                `
            },
            rmse: {
                title: "拟合误差 (RMSE)",
                body: `
                    <h4>定义：</h4>
                    <p>评估临界功率模型拟合质量的统计指标，代表模型预测值与实际测量值之间差异的标准差。</p>
                    
                    <h4>计算：</h4>
                    <p>RMSE = √[(Σ(预测值 - 实际值)²)/n]</p>
                    
                    <h4>重要性：</h4>
                    <ul>
                        <li>反映模型预测准确性</li>
                        <li>较低的RMSE表示更好的拟合质量</li>
                        <li>帮助比较不同模型(双参数vs三参数)的优劣</li>
                    </ul>
                    
                    <h4>典型值：</h4>
                    <ul>
                        <li>高质量拟合: RMSE < 2-3%</li>
                        <li>可接受拟合: RMSE 3-5%</li>
                        <li>较差拟合: RMSE > 5%</li>
                    </ul>
                    
                    <h4>应用：</h4>
                    <ul>
                        <li>模型选择依据</li>
                        <li>识别异常测试数据</li>
                        <li>量化预测的可靠性</li>
                    </ul>
                `
            },
            vo2max: {
                title: "最大摄氧量 (VO2Max)",
                body: `
                    <h4>定义：</h4>
                    <p>个体在递增负荷运动中，当摄氧量不再随运动强度增加而增加时所达到的最大值。</p>
                    
                    <h4>生理意义：</h4>
                    <ul>
                        <li>由心输出量(心率×每搏输出量)和动静脉氧差共同决定</li>
                        <li>受心血管系统、呼吸系统和肌肉代谢能力共同限制</li>
                        <li>40-50%由遗传因素决定，其余可通过训练改变</li>
                    </ul>
                    
                    <h4>典型值：</h4>
                    <ul>
                        <li>休闲骑行者: 45-55 ml/kg/min</li>
                        <li>训练有素的业余骑行者: 55-65 ml/kg/min</li>
                        <li>精英骑行者: 65-75 ml/kg/min</li>
                        <li>世界级职业选手: 75-85+ ml/kg/min</li>
                    </ul>
                    
                    <h4>应用：</h4>
                    <ul>
                        <li>制定训练计划和目标</li>
                        <li>评估耐力训练效果</li>
                        <li>预测耐力赛事表现</li>
                        <li>确定运动员分类和潜力</li>
                    </ul>
                `
            },
            zones: {
                title: "训练区间",
                body: `
                    <h4>概述：</h4>
                    <p>训练区间是基于临界功率(CP)和最大瞬时功率(Pmax)划分的不同训练强度范围，用于指导结构化训练。</p>
                    
                    <h4>目的：</h4>
                    <ul>
                        <li>提供精确的训练强度指导</li>
                        <li>确保针对特定生理系统的刺激</li>
                        <li>优化训练负荷和适应</li>
                        <li>减少过度训练风险</li>
                    </ul>
                    
                    <h4>应用：</h4>
                    <ul>
                        <li>周期化训练计划设计</li>
                        <li>针对不同赛事的专项准备</li>
                        <li>个性化训练处方制定</li>
                        <li>训练效果监控与调整</li>
                    </ul>
                    
                    <p>点击各个具体区间名称可查看详细解释。</p>
                `
            },
            recovery: {
                title: "恢复区间",
                body: `
                    <h4>强度范围：</h4>
                    <p>0% - 60% CP</p>
                    
                    <h4>生理特征：</h4>
                    <ul>
                        <li>主要依赖脂肪代谢</li>
                        <li>几乎不产生乳酸</li>
                        <li>交感神经活动低</li>
                    </ul>
                    
                    <h4>感觉描述：</h4>
                    <p>轻松、可以正常交谈、呼吸舒适</p>
                    
                    <h4>应用目的：</h4>
                    <ul>
                        <li>高强度训练后主动恢复</li>
                        <li>长时间耐力训练的初始阶段</li>
                        <li>技术动作练习</li>
                    </ul>
                    
                    <h4>典型训练形式：</h4>
                    <ul>
                        <li>恢复骑行：30-60分钟</li>
                        <li>热身和整理活动</li>
                    </ul>
                `
            },
            endurance: {
                title: "耐力区间",
                body: `
                    <h4>强度范围：</h4>
                    <p>60% - 90% CP</p>
                    
                    <h4>生理特征：</h4>
                    <ul>
                        <li>有氧代谢为主，逐渐提高碳水化合物使用比例</li>
                        <li>乳酸水平低但可测量(1-2 mmol/L)</li>
                        <li>增加毛细血管密度</li>
                    </ul>
                    
                    <h4>感觉描述：</h4>
                    <p>稳定、受控、可以短句交谈、呼吸有节奏</p>
                    
                    <h4>应用目的：</h4>
                    <ul>
                        <li>提高基础耐力</li>
                        <li>增加有氧代谢酶活性</li>
                        <li>改善脂肪利用效率</li>
                    </ul>
                    
                    <h4>典型训练形式：</h4>
                    <ul>
                        <li>稳定骑行：1-5小时</li>
                        <li>长间歇：15-30分钟×2-4组</li>
                        <li>耐力骑行基础阶段</li>
                    </ul>
                `
            },
            tempo: {
                title: "节奏区间",
                body: `
                    <h4>强度范围：</h4>
                    <p>90% - 95% CP</p>
                    
                    <h4>生理特征：</h4>
                    <ul>
                        <li>接近第一乳酸阈值</li>
                        <li>碳水化合物成为主要燃料</li>
                        <li>乳酸水平维持在2-3 mmol/L</li>
                    </ul>
                    
                    <h4>感觉描述：</h4>
                    <p>控制下的努力、呼吸加深、交谈受限、需要集中注意力</p>
                    
                    <h4>应用目的：</h4>
                    <ul>
                        <li>提高乳酸阈值</li>
                        <li>增加肌糖原储存</li>
                        <li>改善持续高强度能力</li>
                    </ul>
                    
                    <h4>典型训练形式：</h4>
                    <ul>
                        <li>节奏骑行：20-60分钟</li>
                        <li>中间歇：10-20分钟×2-4组</li>
                        <li>团体训练骑行</li>
                    </ul>
                `
            },
            threshold: {
                title: "阈值区间",
                body: `
                    <h4>强度范围：</h4>
                    <p>95% - 105% CP</p>
                    
                    <h4>生理特征：</h4>
                    <ul>
                        <li>接近或达到最大乳酸稳态(MLSS)</li>
                        <li>乳酸水平在3-5 mmol/L范围</li>
                        <li>乳酸产生和清除达到平衡状态</li>
                    </ul>
                    
                    <h4>感觉描述：</h4>
                    <p>受控的痛苦、呼吸沉重、只能说单词、腿部明显发紧</p>
                    
                    <h4>应用目的：</h4>
                    <ul>
                        <li>提高临界功率</li>
                        <li>增强乳酸缓冲能力</li>
                        <li>提高长时间高强度忍耐力</li>
                    </ul>
                    
                    <h4>典型训练形式：</h4>
                    <ul>
                        <li>阈值间歇：8-30分钟×2-4组</li>
                        <li>稳定阈值骑行：20-60分钟</li>
                        <li>比赛状态下计时赛</li>
                    </ul>
                `
            },
            vo2max_zone: {
                title: "VO2Max区间",
                body: `
                    <h4>强度范围：</h4>
                    <p>105% - 130% CP</p>
                    
                    <h4>生理特征：</h4>
                    <ul>
                        <li>超过临界功率，W'开始消耗</li>
                        <li>接近或达到最大摄氧量</li>
                        <li>乳酸水平快速上升(6-10 mmol/L)</li>
                    </ul>
                    
                    <h4>感觉描述：</h4>
                    <p>强烈不适、呼吸急促、无法交谈、肌肉燃烧感</p>
                    
                    <h4>应用目的：</h4>
                    <ul>
                        <li>最大化VO2Max发展</li>
                        <li>提高心输出量</li>
                        <li>增强高强度耐受能力</li>
                    </ul>
                    
                    <h4>典型训练形式：</h4>
                    <ul>
                        <li>VO2Max间歇：3-5分钟×4-8组</li>
                        <li>高强度训练赛</li>
                        <li>短爬坡重复练习</li>
                    </ul>
                `
            },
            anaerobic: {
                title: "无氧区间",
                body: `
                    <h4>强度范围：</h4>
                    <p>130% CP - 80% Pmax</p>
                    
                    <h4>生理特征：</h4>
                    <ul>
                        <li>无氧糖酵解成为主要能量系统</li>
                        <li>乳酸快速积累(10-15 mmol/L)</li>
                        <li>W'快速消耗</li>
                    </ul>
                    
                    <h4>感觉描述：</h4>
                    <p>极度不适、呼吸极限、肌肉严重酸痛、接近全力</p>
                    
                    <h4>应用目的：</h4>
                    <ul>
                        <li>提高无氧能力</li>
                        <li>增强乳酸耐受性</li>
                        <li>提高W'容量</li>
                    </ul>
                    
                    <h4>典型训练形式：</h4>
                    <ul>
                        <li>无氧间歇：30秒-2分钟×6-12组</li>
                        <li>短冲刺训练</li>
                        <li>高强度爬坡</li>
                    </ul>
                `
            },
            neuromuscular: {
                title: "神经肌肉区间",
                body: `
                    <h4>强度范围：</h4>
                    <p>80% - 100% Pmax</p>
                    
                    <h4>生理特征：</h4>
                    <ul>
                        <li>ATP-CP系统为主要能量来源</li>
                        <li>最大神经肌肉激活</li>
                        <li>肌肉瞬间最大力量爆发</li>
                    </ul>
                    
                    <h4>感觉描述：</h4>
                    <p>爆发性全力、无法维持、骑行频率最大化</p>
                    
                    <h4>应用目的：</h4>
                    <ul>
                        <li>提高神经肌肉力量</li>
                        <li>改善快肌纤维募集</li>
                        <li>增强爆发力和加速能力</li>
                    </ul>
                    
                    <h4>典型训练形式：</h4>
                    <ul>
                        <li>极短冲刺：5-15秒×6-12组</li>
                        <li>爆发力训练</li>
                        <li>起步练习</li>
                    </ul>
                `
            }
        };
        
        return infoContents[infoType] || {
            title: "信息",
            body: "<p>没有可用的详细信息。</p>"
        };
    }
});
