import { getState, subscribe, setState, addToCompare, removeFromCompare, clearCompareItems } from './state_manager.js';
import { processActiveSheet, calculateAverage } from './excel_service.js';

const elements = {
    sheetList: document.getElementById('sheet-list'),
    table: document.getElementById('data-table'),
    thead: document.querySelector('#data-table thead'),
    tbody: document.querySelector('#data-table tbody'),
    emptyState: document.getElementById('empty-state'),
    paginationInfo: document.getElementById('pagination-info'),
    pageIndicator: document.getElementById('page-indicator'),
    prevBtn: document.getElementById('prev-page'),
    nextBtn: document.getElementById('next-page'),
    fileName: document.getElementById('file-name-display'),
    resetBtn: document.getElementById('reset-btn'),
    container: document.getElementById('table-container'),
    searchInput: document.getElementById('search-input'),
    // 对比项显示元素
    compareItemsContainer: document.getElementById('compare-items-container'),
    compareItemsPlaceholder: document.getElementById('compare-items-placeholder'),
    compareCount: document.getElementById('compare-count')
};

export const initUI = () => {
    lucide.createIcons();
    
    // 添加搜索模式切换按钮（默认为模糊查询）
    const searchModeBtn = document.createElement('button');
    searchModeBtn.id = 'search-mode-btn';
    searchModeBtn.className = 'ml-2 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-3 py-2';
    searchModeBtn.innerHTML = '<i data-lucide="search" class="w-4 h-4 mr-1"></i>模糊查询';
    elements.searchInput.parentNode.appendChild(searchModeBtn);
    
    // 添加显示模式切换按钮
    const modeToggleContainer = document.createElement('div');
    modeToggleContainer.className = 'flex items-center gap-2 ml-4';
    modeToggleContainer.innerHTML = `
        <span class="text-xs text-muted-foreground">显示模式:</span>
        <div class="flex rounded-md overflow-hidden border border-input">
            <button id="mode-average" class="px-3 py-1.5 text-xs font-medium transition-colors bg-background text-foreground hover:bg-accent">平均值</button>
            <button id="mode-all" class="px-3 py-1.5 text-xs font-medium transition-colors bg-primary text-primary-foreground">参数</button>
        </div>
    `;
    document.querySelector('.items-center.gap-4').appendChild(modeToggleContainer);
    
    // 注意：对比按钮已在HTML中定义，不需要再动态创建
    
    // 绑定事件
    searchModeBtn.addEventListener('click', toggleSearchMode);
    
    document.getElementById('mode-average').addEventListener('click', () => {
        setState({ config: { ...getState().config, displayMode: 'average' } });
        renderTable();
    });
    
    document.getElementById('mode-all').addEventListener('click', () => {
        setState({ config: { ...getState().config, displayMode: 'all' } });
        renderTable();
    });
    
    // 绑定数据对比功能事件（使用HTML中定义的按钮）
    document.getElementById('compare-toggle').addEventListener('click', () => {
        showCompareDialog();
    });
    
    // 绑定一键操作按钮事件
    document.getElementById('select-all-btn').addEventListener('click', () => {
        selectAllFilteredItems();
    });
    
    document.getElementById('clear-selection-btn').addEventListener('click', () => {
        clearAllSelections();
    });
    
    subscribe((event, payload, state) => {
        if (event === 'state:reset') renderReset();
        if (event === 'sheetNames:updated') renderSidebar(state.sheetNames, state.activeSheetName);
        if (event === 'activeSheetName:updated') {
            renderSidebar(state.sheetNames, state.activeSheetName);
            processActiveSheet();
        }
        if (event === 'processedData:updated' || event === 'pagination:updated' || event === 'config:updated') {
            renderTable();
            updatePaginationControls();
            updateModeButtons(); // 更新模式按钮状态
            updateSearchModeButton(); // 更新搜索模式按钮状态
            // 确保侧边栏数量实时更新
            const { sheetNames, activeSheetName } = getState();
            renderSidebar(sheetNames, activeSheetName);
        }
        if (event === 'file:updated') {
            elements.fileName.textContent = state.file.name;
            elements.resetBtn.classList.remove('hidden');
            elements.emptyState.classList.add('hidden');
            elements.table.classList.remove('hidden');
        }
        // 当原始合并数据更新时，也要更新侧边栏
        if (event === 'originalMergedData:updated') {
            const { sheetNames, activeSheetName } = getState();
            renderSidebar(sheetNames, activeSheetName);
        }
        // 数据对比相关状态更新
        if (event === 'compareItems:updated') {
            renderTable(); // 重新渲染表格以更新行的样式
            renderCompareItems(); // 渲染对比项
            // 确保侧边栏数量实时更新
            const { sheetNames, activeSheetName } = getState();
            renderSidebar(sheetNames, activeSheetName);
        }
    });
    
    // 初始化冻结行和冻结列的默认值
    const { config } = getState();
    document.getElementById('freeze-row').value = config.freezeRow;
    document.getElementById('freeze-col').value = config.freezeCol;
    
    // 初始化显示模式按钮状态
    updateModeButtons();
    
    // 初始化搜索模式按钮状态
    updateSearchModeButton();
    
    // 初始化Lucide图标
    lucide.createIcons();
};

const toggleSearchMode = () => {
    const { config } = getState();
    const newIsPreciseSearch = !config.isPreciseSearch;
    
    setState({ 
        config: { 
            ...config, 
            isPreciseSearch: newIsPreciseSearch
        } 
    });
    
    // 如果有搜索词，则重新处理数据
    if (config.searchQuery) {
        processActiveSheet();
        
        // 确保侧边栏数量同步更新
        setTimeout(() => {
            const { sheetNames, activeSheetName } = getState();
            renderSidebar(sheetNames, activeSheetName);
        }, 0);
    }
    
    // 更新按钮显示
    updateSearchModeButton();
};

const updateSearchModeButton = () => {
    const { isPreciseSearch } = getState().config;
    const searchModeBtn = document.getElementById('search-mode-btn');
    
    if (isPreciseSearch) {
        searchModeBtn.innerHTML = '<i data-lucide="target" class="w-4 h-4 mr-1"></i>精准查询';
    } else {
        searchModeBtn.innerHTML = '<i data-lucide="search" class="w-4 h-4 mr-1"></i>模糊查询';
    }
    
    lucide.createIcons();
};

const updateModeButtons = () => {
    const { displayMode } = getState().config;
    document.getElementById('mode-average').className = displayMode === 'average' 
        ? 'px-3 py-1.5 text-xs font-medium transition-colors bg-primary text-primary-foreground' 
        : 'px-3 py-1.5 text-xs font-medium transition-colors bg-background text-foreground hover:bg-accent';
        
    document.getElementById('mode-all').className = displayMode === 'all' 
        ? 'px-3 py-1.5 text-xs font-medium transition-colors bg-primary text-primary-foreground' 
        : 'px-3 py-1.5 text-xs font-medium transition-colors bg-background text-foreground hover:bg-accent';
};

const renderReset = () => {
    elements.sheetList.innerHTML = '<div class="text-xs text-muted-foreground text-center mt-10">暂无数据<br>请上传文件</div>';
    elements.thead.innerHTML = '';
    elements.tbody.innerHTML = '';
    elements.emptyState.classList.remove('hidden');
    elements.table.classList.add('hidden');
    elements.fileName.textContent = '未选择文件';
    elements.resetBtn.classList.add('hidden');
    elements.paginationInfo.textContent = '显示 0 - 0 条，共 0 条';
    elements.pageIndicator.textContent = '1 / 1';
    
    // 重置侧边栏
    renderSidebar([], null);
    
    // 重置冻结行和冻结列的值
    document.getElementById('freeze-row').value = 1;
    document.getElementById('freeze-col').value = 2;
    
    // 重置搜索模式按钮
    updateSearchModeButton();
};

const renderSidebar = (sheets, active) => {
    elements.sheetList.innerHTML = '';
    
    if (sheets.length === 0) {
        elements.sheetList.innerHTML = '<div class="text-xs text-muted-foreground text-center mt-10">暂无数据<br>请上传文件</div>';
        return;
    }
    
    // 获取当前搜索结果数量和对比项数量
    const { originalMergedData, config, compareItems } = getState();
    const searchQuery = config.searchQuery;
    const isPreciseSearch = config.isPreciseSearch; // 获取是否为精准查询
    
    sheets.forEach(sheet => {
        // 计算该工作表的结果数量
        let count = 0;
        let compareCount = 0; // 该表被勾选的数量
        
        if (originalMergedData && originalMergedData[sheet]) {
            // 计算搜索结果数量
            if (searchQuery) {
                // 如果有搜索查询，根据查询类型计算匹配的数量
                const filteredData = originalMergedData[sheet].filter(row => {
                    const model = row['型号'] ? row['型号'].toString() : '';
                    if (isPreciseSearch) {
                        // 精准查询：必须完全匹配
                        return model.toLowerCase() === searchQuery.toLowerCase();
                    } else {
                        // 模糊查询：包含即可
                        return model.toLowerCase().includes(searchQuery.toLowerCase());
                    }
                });
                count = filteredData.length;
            } else {
                // 如果没有搜索查询，显示总数量
                count = originalMergedData[sheet].length;
            }
            
            // 计算该表被勾选的数量
            compareCount = compareItems.filter(item => {
                // 这里需要找到该表中与对比项匹配的行
                // 由于数据结构的复杂性，我们简单地检查型号和批次是否匹配
                return originalMergedData[sheet].some(row => 
                    row['型号'] === item['型号'] && row['批次'] === item['批次']
                );
            }).length;
        }
        
        const div = document.createElement('div');
        div.className = `sheet-item px-3 py-2 rounded-md text-sm cursor-pointer flex items-center justify-between gap-2 ${sheet === active ? 'active' : 'text-muted-foreground hover:bg-secondary/50 hover:text-secondary-foreground'}`;
        div.innerHTML = `
            <div class="flex items-center gap-2">
                <i data-lucide="table-2" class="w-4 h-4"></i>
                <span class="truncate">${sheet}</span>
            </div>
            <div class="flex items-center gap-1">
                <span class="bg-secondary text-secondary-foreground text-xs rounded-full px-2 py-0.5">${count}</span>
                ${compareCount > 0 ? `<span class="bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5">${compareCount}</span>` : ''}
            </div>
        `;
        div.onclick = () => setState({ activeSheetName: sheet });
        elements.sheetList.appendChild(div);
    });
    lucide.createIcons();
};

/**
 * 高亮显示搜索关键词
 * @param {string} text - 要高亮的文本
 * @param {string} searchTerm - 搜索词
 * @returns {string} 高亮处理后的文本
 */
const highlightSearchTerm = (text, searchTerm) => {
    if (!searchTerm || !text) {
        return text;
    }
    
    // 转义特殊字符
    const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedSearchTerm})`, 'gi');
    
    // 使用highlight类包装匹配的文本
    return text.toString().replace(regex, '<span class="bg-yellow-200 text-yellow-900 font-bold">$1</span>');
};

const renderTable = () => {
    const { processedData, pagination, config, compareItems } = getState();
    const { currentPage, pageSize } = pagination;
    const { freezeRow, freezeCol, searchQuery, displayMode } = config;

    elements.thead.innerHTML = '';
    elements.tbody.innerHTML = '';

    if (processedData.length === 0) {
        elements.tbody.innerHTML = '<tr><td colspan="100" class="text-center py-8 text-muted-foreground">无匹配数据</td></tr>';
        return;
    }

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, processedData.length);
    const pageData = processedData.slice(startIndex, endIndex);

    // 收集所有唯一的字段名作为表头
    const allKeys = new Set();
    processedData.forEach(row => {
        Object.keys(row).forEach(key => allKeys.add(key));
    });
    
    // 创建表头（始终显示，即使freezeRow为0）
    const headerRow = Array.from(allKeys);
    const tr = document.createElement('tr');
    headerRow.forEach((key, idx) => {
        const th = document.createElement('th');
        th.className = `px-4 py-3 font-medium border-b border-border text-xs whitespace-nowrap ${idx < freezeCol ? 'sticky-col' : ''} ${idx < freezeCol ? 'z-30' : ''}`;
        if (idx < freezeCol) th.style.left = `${idx * 100}px`;
        // 添加sticky-header类以确保表头不透明
        th.classList.add('sticky-header');
        th.textContent = key || '';
        tr.appendChild(th);
    });
    elements.thead.appendChild(tr);

    // 渲染数据行
    pageData.forEach((row, rowIndex) => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-muted/30 transition-colors";
        
        // 检查当前行是否在对比项中
        const isInCompare = compareItems.some(item => 
            item['型号'] === row['型号'] && item['批次'] === row['批次']
        );
        
        // 如果在对比项中，添加特殊样式
        if (isInCompare) {
            tr.classList.add('bg-blue-50', 'border-l-4', 'border-l-blue-500');
        }
        
        // 添加点击事件，用于添加到对比项
        tr.addEventListener('click', (e) => {
            // 检查是否应该忽略点击事件
            // 忽略具有特定类名的元素的点击事件
            if (e.target.classList.contains('ignore-click') || 
                e.target.closest('.ignore-click')) {
                return;
            }
            
            // 切换对比项
            if (isInCompare) {
                removeFromCompare(row);
            } else {
                addToCompare(row);
            }
        });
        
        headerRow.forEach((key, idx) => {
            const value = row[key];
            const td = document.createElement('td');
            td.className = `px-4 py-2 border-b border-border whitespace-nowrap truncate max-w-[300px] ${idx < freezeCol ? 'sticky-col' : ''}`;
            if (idx < freezeCol) td.style.left = `${idx * 100}px`;
            
            let displayValue = '';
            
            if (value === undefined || value === null) {
                displayValue = '';
            } else if (Array.isArray(value)) {
                // 根据显示模式决定如何显示数据
                const average = calculateAverage(value);
                if (displayMode === 'average') {
                    // 默认显示平均值
                    displayValue = `<span class="text-pink-600 font-bold">${average.toFixed(2)}</span>`;
                } else {
                    // 显示所有参数值
                    const bracketValues = value.map(v => 
                        `<span class="param-value">[${highlightSearchTerm(v, searchQuery)}]</span>`
                    ).join('');
                    displayValue = `${bracketValues} (<span class="text-pink-600 font-bold">${average.toFixed(2)}</span>)`;
                }
            } else {
                // 对普通值进行高亮处理
                displayValue = highlightSearchTerm(value.toString(), searchQuery);
            }
            
            td.innerHTML = displayValue;
            tr.appendChild(td);
        });
        
        elements.tbody.appendChild(tr);
    });
    
    updateStickyOffsets();
};

// 渲染对比项
const renderCompareItems = () => {
    const { compareItems } = getState();
    
    if (!elements.compareItemsContainer || !elements.compareItemsPlaceholder) return;
    
    // 更新对比项数量
    if (elements.compareCount) {
        elements.compareCount.textContent = compareItems.length;
    }
    
    // 清空容器
    elements.compareItemsContainer.innerHTML = '';
    
    if (compareItems.length === 0) {
        // 显示占位符
        elements.compareItemsContainer.appendChild(elements.compareItemsPlaceholder);
        elements.compareItemsPlaceholder.style.display = 'block';
        return;
    }
    
    // 隐藏占位符
    elements.compareItemsPlaceholder.style.display = 'none';
    
    // 渲染对比项
    compareItems.forEach(item => {
        const div = document.createElement('div');
        div.className = 'flex items-center justify-between p-2 rounded text-xs bg-secondary/50 hover:bg-secondary';
        div.innerHTML = `
            <div class="truncate">
                <div class="font-medium truncate">${item['型号'] || '未知型号'}</div>
                <div class="text-muted-foreground truncate">批次: ${item['批次'] || '未知批次'}</div>
            </div>
            <button class="remove-compare-item p-1 rounded hover:bg-accent" data-model="${item['型号'] || ''}" data-batch="${item['批次'] || ''}">
                <i data-lucide="x" class="w-3 h-3"></i>
            </button>
        `;
        elements.compareItemsContainer.appendChild(div);
    });
    
    // 绑定移除事件
    document.querySelectorAll('.remove-compare-item').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const model = button.getAttribute('data-model');
            const batch = button.getAttribute('data-batch');
            removeFromCompare({ '型号': model, '批次': batch });
        });
    });
    
    lucide.createIcons();
};

const updateStickyOffsets = () => {
    const stickyCells = document.querySelectorAll('.sticky-col');
    let currentLeft = 0;
    let previousIndex = -1;
    
    const headerCells = elements.thead.querySelectorAll('th');
    if (headerCells.length === 0) return;

    let accumulatedWidths = [];
    let acc = 0;
    headerCells.forEach(th => {
        accumulatedWidths.push(acc);
        acc += th.getBoundingClientRect().width;
    });

    const rows = document.querySelectorAll('tr');
    rows.forEach(row => {
        const cells = row.children;
        for (let i = 0; i < getState().config.freezeCol; i++) {
            if (cells[i]) {
                cells[i].style.left = `${accumulatedWidths[i]}px`;
            }
        }
    });
};

const updatePaginationControls = () => {
    const { pagination } = getState();
    const totalPages = Math.ceil(pagination.totalItems / pagination.pageSize) || 1;
    
    elements.pageIndicator.textContent = `${pagination.currentPage} / ${totalPages}`;
    
    elements.prevBtn.disabled = pagination.currentPage <= 1;
    elements.nextBtn.disabled = pagination.currentPage >= totalPages;
    
    const start = (pagination.currentPage - 1) * pagination.pageSize + 1;
    const end = Math.min(pagination.currentPage * pagination.pageSize, pagination.totalItems);
    elements.paginationInfo.textContent = pagination.totalItems > 0 
        ? `显示 ${start} - ${end} 条，共 ${pagination.totalItems} 条`
        : '无数据';
};

// 一键选择所有筛选结果
const selectAllFilteredItems = () => {
    const { processedData, compareItems } = getState();
    
    // 获取当前未被选择的项目
    const unselectedItems = processedData.filter(item => 
        !compareItems.some(compareItem => 
            compareItem['型号'] === item['型号'] && compareItem['批次'] === item['批次']
        )
    );
    
    if (unselectedItems.length === 0) {
        showToast('当前没有可添加的项目');
        return;
    }
    
    // 批量添加所有未被选择的项目到对比项中
    const newCompareItems = [...compareItems, ...unselectedItems];
    setState({ compareItems: newCompareItems });
    
    showToast(`已添加 ${unselectedItems.length} 个项目到对比项`);
    
    // 确保侧边栏数量实时更新
    setTimeout(() => {
        const { sheetNames, activeSheetName } = getState();
        renderSidebar(sheetNames, activeSheetName);
    }, 0);
};

// 一键清空所有选择
const clearAllSelections = () => {
    const { compareItems } = getState();
    
    if (compareItems.length === 0) {
        showToast('当前没有选中的项目');
        return;
    }
    
    // 保存当前对比项的数量用于提示
    const count = compareItems.length;
    
    // 清空所有对比项
    clearCompareItems();
    showToast(`已清空 ${count} 个对比项`);
    
    // 确保侧边栏数量实时更新
    setTimeout(() => {
        const { sheetNames, activeSheetName } = getState();
        renderSidebar(sheetNames, activeSheetName);
    }, 0);
};

// 执行对比
const executeCompare = () => {
    const { compareItems } = getState();
    
    if (!elements.compareResult || !elements.compareResultContent) return;
    
    if (compareItems.length < 2) {
        showToast('请至少选择两个数据项进行对比', 'error');
        return;
    }
    
    // 显示对比结果
    elements.compareResult.classList.remove('hidden');
    
    // 生成对比结果
    let resultHTML = '<div class="space-y-4">';
    
    // 获取所有字段名
    const allKeys = new Set();
    compareItems.forEach(item => {
        Object.keys(item).forEach(key => allKeys.add(key));
    });
    
    // 创建对比表格
    resultHTML += '<table class="w-full text-sm">';
    resultHTML += '<thead><tr><th class="text-left p-2">参数</th>';
    
    // 表头：每个对比项的型号和批次
    compareItems.forEach(item => {
        resultHTML += `<th class="text-left p-2">${item['型号'] || '未知'}<br/><span class="text-xs text-muted-foreground">${item['批次'] || '未知'}</span></th>`;
    });
    
    resultHTML += '</tr></thead><tbody>';
    
    // 为每个字段生成对比行
    allKeys.forEach(key => {
        // 跳过型号和批次字段，因为它们已经在表头显示
        if (key === '型号' || key === '批次') return;
        
        resultHTML += `<tr class="border-b border-border"><td class="p-2 font-medium">${key}</td>`;
        
        compareItems.forEach(item => {
            const value = item[key];
            let displayValue = '';
            
            if (value === undefined || value === null) {
                displayValue = '-';
            } else if (Array.isArray(value)) {
                // 对于数组值，显示平均值
                const average = calculateAverage(value);
                displayValue = `<span class="text-pink-600 font-bold">${average.toFixed(2)}</span>`;
            } else {
                displayValue = value.toString();
            }
            
            resultHTML += `<td class="p-2">${displayValue}</td>`;
        });
        
        resultHTML += '</tr>';
    });
    
    resultHTML += '</tbody></table></div>';
    
    elements.compareResultContent.innerHTML = resultHTML;
    
    showToast('对比完成');
};

// 显示对比对话框
const showCompareDialog = () => {
    const { compareItems } = getState();
    
    // 生成对比结果
    let resultHTML = '<div style="font-family: sans-serif; max-height: 80vh; overflow-y: auto;">';
    resultHTML += '<h2 style="margin-bottom: 16px; color: #0f172a;">数据对比结果</h2>';
    
    if (compareItems.length === 0) {
        resultHTML += '<p style="color: #64748b;">请先选择要对比的数据项！</p>';
    } else if (compareItems.length < 2) {
        resultHTML += '<p style="color: #64748b;">请至少选择两个数据项进行对比！</p>';
    } else {
        // 创建对比表格
        resultHTML += '<table style="width: 100%; border-collapse: collapse; margin-top: 16px;">';
        resultHTML += '<thead><tr style="background-color: #f1f5f9;">';
        resultHTML += '<th style="padding: 8px; border: 1px solid #cbd5e1; text-align: left;">参数</th>';
        
        // 表头：每个对比项的型号和批次
        compareItems.forEach(item => {
            resultHTML += `<th style="padding: 8px; border: 1px solid #cbd5e1; text-align: left;">${item['型号'] || '未知'}<br/><span style="font-size: 0.8em; color: #64748b;">${item['批次'] || '未知'}</span></th>`;
        });
        
        resultHTML += '</tr></thead><tbody>';
        
        // 获取所有字段名
        const allKeys = new Set();
        compareItems.forEach(item => {
            Object.keys(item).forEach(key => allKeys.add(key));
        });
        
        // 为每个字段生成对比行
        allKeys.forEach(key => {
            // 跳过型号和批次字段，因为它们已经在表头显示
            if (key === '型号' || key === '批次') return;
            
            resultHTML += `<tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: 500;">${key}</td>`;
            
            compareItems.forEach(item => {
                const value = item[key];
                let displayValue = '';
                
                if (value === undefined || value === null) {
                    displayValue = '-';
                } else if (Array.isArray(value)) {
                    // 对于数组值，显示平均值
                    const average = calculateAverage(value);
                    displayValue = `<span style="color: #e91e63; font-weight: bold;">${average.toFixed(2)}</span>`;
                } else {
                    displayValue = value.toString();
                }
                
                resultHTML += `<td style="padding: 8px; border: 1px solid #cbd5e1;">${displayValue}</td>`;
            });
            
            resultHTML += '</tr>';
        });
        
        resultHTML += '</tbody></table>';
    }
    
    resultHTML += '</div>';
    
    // 创建自定义弹窗
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background-color: white;
        padding: 24px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        max-width: 90%;
        max-height: 90%;
        overflow: hidden;
        position: relative;
    `;
    
    modalContent.innerHTML = resultHTML;
    
    // 添加关闭按钮
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = `
        position: absolute;
        top: 8px;
        right: 12px;
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #64748b;
    `;
    
    closeBtn.onclick = () => {
        document.body.removeChild(modal);
    };
    
    modal.onclick = (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    };
    
    modalContent.appendChild(closeBtn);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
};

export const showToast = (message, type = 'info') => {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium border ${type === 'error' ? 'bg-destructive text-white border-destructive' : 'bg-foreground text-background border-border'}`;
    toast.innerHTML = `<span>${message}</span>`;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('exiting');
        toast.addEventListener('animationend', () => toast.remove());
    }, 3000);
};