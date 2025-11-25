import { getState, subscribe, setState } from './state_manager.js';
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
    searchInput: document.getElementById('search-input')
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
    
    // 获取当前搜索结果数量
    const { originalMergedData, config } = getState();
    const searchQuery = config.searchQuery;
    const isPreciseSearch = config.isPreciseSearch; // 获取是否为精准查询
    
    sheets.forEach(sheet => {
        // 计算该工作表的结果数量
        let count = 0;
        if (originalMergedData && originalMergedData[sheet]) {
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
        }
        
        const div = document.createElement('div');
        div.className = `sheet-item px-3 py-2 rounded-md text-sm cursor-pointer flex items-center justify-between gap-2 ${sheet === active ? 'active' : 'text-muted-foreground hover:bg-secondary/50 hover:text-secondary-foreground'}`;
        div.innerHTML = `
            <div class="flex items-center gap-2">
                <i data-lucide="table-2" class="w-4 h-4"></i>
                <span class="truncate">${sheet}</span>
            </div>
            <span class="bg-secondary text-secondary-foreground text-xs rounded-full px-2 py-0.5">${count}</span>
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
    const { processedData, pagination, config } = getState();
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
    pageData.forEach((row) => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-muted/30 transition-colors";
        
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