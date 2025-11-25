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
    state.pagination = { currentPage: 1, pageSize: 50, totalItems: 0 };
    state.config.searchQuery = '';
    state.config.isPreciseSearch = false;
    state.config.displayMode = 'all'; // 重置时也设为参数模式
    state.config.freezeRow = 1; // 重置时设为默认值
    state.config.freezeCol = 2; // 重置时设为默认值
    notify('state:reset');
};