/**
 * Centralized State Management
 * Follows a simple pub/sub pattern for reactivity.
 */

const state = {
    file: null,
    workbook: null,     // Raw SheetJS workbook
    sheetNames: [],
    activeSheetName: null,
    data: {},           // Map: sheetName -> Array of objects
    processedData: [],  // Currently displayed data (after search/filter)
    originalMergedData: {}, // 原始合并数据用于搜索
    
    // 数据对比相关状态
    compareItems: [],   // 用于对比的数据项
    isComparePanelOpen: false, // 对比面板是否打开
    
    pagination: {
        currentPage: 1,
        pageSize: 50,
        totalItems: 0
    },
    config: {
        freezeRow: 1,   // 默认冻结行设为1
        freezeCol: 2,   // 默认冻结列设为2
        searchQuery: '',
        isPreciseSearch: false, // 是否为精准查询
        displayMode: 'all' // 默认显示模式设为'all'(参数)，而不是'average'(平均值)
    }
};

const listeners = new Set();

export const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

const notify = (event, payload) => {
    listeners.forEach(l => l(event, payload, state));
};

export const setState = (updates) => {
    let hasChanges = false;
    let events = [];

    for (const [key, value] of Object.entries(updates)) {
        if (state[key] !== value) {

            if (key === 'config' && typeof value === 'object') {
                state.config = { ...state.config, ...value };
                events.push('config:updated');
            } else if (key === 'pagination' && typeof value === 'object') {
                state.pagination = { ...state.pagination, ...value };
                events.push('pagination:updated');
            } else {
                state[key] = value;
                events.push(`${key}:updated`);
            }
            hasChanges = true;
        }
    }

    if (hasChanges) {
        events.forEach(e => notify(e, null));
    }
};

export const getState = () => state;

export const resetState = () => {
    state.file = null;
    state.workbook = null;
    state.sheetNames = [];
    state.activeSheetName = null;
    state.data = {};
    state.processedData = [];
    state.originalMergedData = {};
    state.compareItems = []; // 重置对比项
    state.isComparePanelOpen = false; // 关闭对比面板
    state.pagination = { currentPage: 1, pageSize: 50, totalItems: 0 };
    state.config.searchQuery = '';
    state.config.isPreciseSearch = false;
    state.config.displayMode = 'all'; // 重置时也设为参数模式
    state.config.freezeRow = 1; // 重置时设为默认值
    state.config.freezeCol = 2; // 重置时设为默认值
    notify('state:reset');
};

// 添加到对比项的函数
export const addToCompare = (item) => {
    const existingIndex = state.compareItems.findIndex(compareItem => 
        compareItem['型号'] === item['型号'] && compareItem['批次'] === item['批次']
    );
    
    if (existingIndex === -1) {
        // 如果不存在，则添加
        setState({ compareItems: [...state.compareItems, item] });
    }
};

// 从对比项中移除的函数
export const removeFromCompare = (item) => {
    const filteredItems = state.compareItems.filter(compareItem => 
        !(compareItem['型号'] === item['型号'] && compareItem['批次'] === item['批次'])
    );
    setState({ compareItems: filteredItems });
};

// 清空对比项
export const clearCompareItems = () => {
    setState({ compareItems: [] });
};

// 切换对比面板状态
export const toggleComparePanel = () => {
    setState({ isComparePanelOpen: !state.isComparePanelOpen });
};