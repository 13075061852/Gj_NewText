import { initTheme } from './theme.js';
import { initUI, showToast } from './ui_controller.js';
import { handleFileUpload, loadDefaultTestFile } from './excel_service.js';
import { setState, getState, resetState, addToCompare, removeFromCompare, clearCompareItems, toggleComparePanel } from './state_manager.js';
import { processActiveSheet } from './excel_service.js';

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initUI();

    // 页面加载完成后尝试加载默认测试文件
    setTimeout(() => {
        loadDefaultTestFile();
    }, 500);

    const fileInput = document.getElementById('file-upload');
    const dropZone = document.body;
    const searchInput = document.getElementById('search-input');
    const freezeRowInput = document.getElementById('freeze-row');
    const freezeColInput = document.getElementById('freeze-col');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const exportBtn = document.getElementById('export-json');
    const resetBtn = document.getElementById('reset-btn');
    const compareToggle = document.getElementById('compare-toggle');


    fileInput.addEventListener('change', (e) => handleFileUpload(e.target.files[0]));


    window.addEventListener('dragover', (e) => {
        e.preventDefault();
        document.body.classList.add('drag-over');
    });
    
    window.addEventListener('dragleave', (e) => {
        if (e.clientX === 0 && e.clientY === 0) {
             document.body.classList.remove('drag-over');
        }
    });

    window.addEventListener('drop', (e) => {
        e.preventDefault();
        document.body.classList.remove('drag-over');
        if (e.dataTransfer.files.length) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });


    searchInput.addEventListener('input', (e) => {
        setState({ 
            config: { 
                ...getState().config,
                searchQuery: e.target.value
                // 不再重置isPreciseSearch，保持当前的搜索模式
            } 
        });
        processActiveSheet();
    });

    freezeRowInput.addEventListener('change', (e) => {
        setState({ config: { freezeRow: parseInt(e.target.value) || 0 } });
    });

    freezeColInput.addEventListener('change', (e) => {
        setState({ config: { freezeCol: parseInt(e.target.value) || 0 } });
    });


    prevBtn.addEventListener('click', () => {
        const current = getState().pagination.currentPage;
        if (current > 1) setState({ pagination: { currentPage: current - 1 } });
    });

    nextBtn.addEventListener('click', () => {
        const { currentPage, totalItems, pageSize } = getState().pagination;
        if (currentPage * pageSize < totalItems) {
            setState({ pagination: { currentPage: currentPage + 1 } });
        }
    });


    resetBtn.addEventListener('click', () => {
        if(confirm('确定要清空当前所有数据吗？')) {
            resetState();
            fileInput.value = '';
        }
    });


    exportBtn.addEventListener('click', () => {
        const { processedData, activeSheetName } = getState();
        if (!processedData || processedData.length === 0) {
            showToast('暂无数据可导出', 'error');
            return;
        }
        
        const dataStr = JSON.stringify(processedData, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeSheetName}_export.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('导出成功');
    });


    // 数据对比功能事件绑定
    if (compareToggle) {
        compareToggle.addEventListener('click', () => {
            toggleComparePanel();
        });
    }

    lucide.createIcons();
});