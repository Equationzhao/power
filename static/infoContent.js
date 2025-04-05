// 获取弹窗内容的信息数据
function getInfoContent(infoType) {
    loadMathJax();

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
                    <li>在此强度下，乳酸产生和清除处于动态平衡状态</li>
                </ul>
            `
        },
        cp_per_kg: {
            title: "功体比 (PWR)",
            body: `
                <h4>定义：</h4>
                <p>临界功率(CP)与体重的比值，单位为瓦特/千克(W/kg)。</p>
                <p>$$PWR = \\frac{CP}{(Weight}$$</p>
                
                <h4>意义：</h4>
                <ul>
                    <li>在爬坡等对抗重力的情境下，是预测表现的关键指标</li>
                    <li>比绝对功率更有效地反映耐力骑行能力</li>
                </ul>
                
                <h4>典型值：</h4>
                <ul>
                    <li>休闲骑行者: 1.5-2.9 W/kg</li>
                    <li>训练有素的业余骑行者: 3.0-3.7 W/kg</li>
                    <li>高水平业余骑行者: 3.8-4.4 W/kg</li>
                    <li>精英/职业骑行者: 4.5-6.5+ W/kg</li>
                </ul>
            `
        },
        wprime: {
            title: "无氧储备 (Anaerobic Reserve, W')",
            body: `
                <h4>定义：</h4>
                <p>运动员在超过临界功率强度时可以完成的总功，单位为焦耳(J)或千焦(kJ)。</p>
                
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
                <p>理论上骑行者在瞬间(t→0)能够产生的最大功率输出。</p>
                <p>$$P_{max} = CP + \\frac{W'}{\\tau}$$</p>
                
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
            title: "时间常数 (Tau)",
            body: `
                <h4>定义：</h4>
                <p>描述功率从最大瞬时功率衰减到临界功率的时间特征，单位为秒。</p>
                
                <h4>关键特性：</h4>
                <ul>
                    <li>表达了功率-时间曲线的曲率</li>
                    <li>较小的τ表示功率衰减更快，较大的τ表示功率衰减更缓慢</li>
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
                <p>$$RMSE = \\sqrt{\\frac{1}{n}\\sum_{i=1}^{n}(y_i - \\hat{y}_i)^2}$$</p>
                <p>其中 $y_i$ 是实际测量值，$\\hat{y}_i$ 是模型预测值，$n$ 是数据点数量。</p>
                <p>较低的RMSE值表示模型拟合更精确。</p>
            `
        },
        vo2max: {
            title: "最大摄氧量 (VO₂Max)",
            body: `
                <h4>定义：</h4>
                <p>个体在递增负荷运动中，当摄氧量不再随运动强度增加而增加时所达到的最大值。</p>
                <p>$$VO_2Max = Q_{max} \\times (a-vO_2)_{diff}$$</p>
                <p>其中 $Q_{max}$ 是最大心输出量，$(a-vO_2)_{diff}$ 是动静脉氧差。</p>
                
                <h4>生理意义：</h4>
                <ul>
                    <li>由心输出量(心率×每搏输出量)和动静脉氧差共同决定</li>
                    <li>受心血管系统、呼吸系统和肌肉代谢能力共同限制</li>
                    <li>40-50%由遗传因素决定，其余可通过训练改变</li>
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
                <p>受控的痛苦、呼吸沉重、难以说法、腿部明显发紧</p>
                
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
            title: "VO₂Max区间",
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
                    <li>最大化VO₂Max发展</li>
                    <li>提高心输出量</li>
                    <li>增强高强度耐受能力</li>
                </ul>
                
                <h4>典型训练形式：</h4>
                <ul>
                    <li>VO₂Max间歇：3-5分钟×4-8组</li>
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
                <p>爆发性全力、无法维持</p>
                
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


// 加载 MathJax 脚本
function loadMathJax() {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
    script.async = true;
    document.head.appendChild(script);
    // 配置 MathJax
    window.MathJax = {
        tex: {
            inlineMath: [['$', '$'], ['\\(', '\\)']],
            displayMath: [['$$', '$$'], ['\\[', '\\]']],
            processEscapes: true
        },
        svg: {
            fontCache: 'global'
        },
        options: {
            enableMenu: false
        }
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getInfoContent };
} else {
    window.getInfoContent = getInfoContent;
}

export { getInfoContent };
