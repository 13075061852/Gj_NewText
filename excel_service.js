import { setState, getState } from './state_manager.js';

/**
 * 计算数组的平均值
 * @param {Array} arr - 数字数组
 * @returns {number} 平均值
 */
export const calculateAverage = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) {
        return 0;
    }
    
    // 过滤出数字值，同时处理特殊标记（如'>10'）
    const numbers = arr.filter(value => {
        // 如果是特殊标记，不参与平均值计算
        if (typeof value === 'string' && (value.startsWith('>') || value.startsWith('<'))) {
            return false;
        }
        return !isNaN(parseFloat(value));
    }).map(value => parseFloat(value));
    
    if (numbers.length === 0) {
        return 0;
    }
    
    const sum = numbers.reduce((acc, num) => acc + num, 0);
    return sum / numbers.length;
};

/**
 * 合并字段值到目标对象
 * @param {Object} targetObj - 目标对象
 * @param {string} key - 字段名
 * @param {any} value - 字段值
 * @param {boolean} isIdentifier - 是否为标识字段（型号或批次）
 */
export const mergeFieldValue = (targetObj, key, value, isIdentifier) => {
    // 对于标识字段不过滤，其他字段保留数字类型值和特殊标记（如'>10'）
    if (!isIdentifier) {
        // 检查是否为特殊标记格式（如'>10', '<5'等）
        if (typeof value === 'string' && (value.startsWith('>') || value.startsWith('<'))) {
            // 保留特殊标记
        } else if (isNaN(parseFloat(value)) || !isFinite(value)) {
            return;
        }
    }
    
    // 处理字段名相似的情况，将它们合并到同一个数组中
    let baseKey = key;
    // 检查是否有带_数字后缀的字段名
    const suffixMatch = key.match(/^(.*)_([0-9]+)$/);
    if (suffixMatch) {
        baseKey = suffixMatch[1];
    }
    
    // 查找是否已存在基础字段名
    let existingKey = null;
    for (const existingField in targetObj) {
        const existingSuffixMatch = existingField.match(/^(.*)_([0-9]+)$/);
        let existingBaseKey = existingField;
        if (existingSuffixMatch) {
            existingBaseKey = existingSuffixMatch[1];
        }
        
        if (existingBaseKey === baseKey) {
            existingKey = existingField;
            break;
        }
    }
    
    // 调试信息：输出要处理的值
    console.log('mergeFieldValue 处理的值:', value, '类型:', typeof value, '是否为特殊标记:', typeof value === 'string' && (value.startsWith('>') || value.startsWith('<')));
    
    // 如果字段已存在，则转换为数组并添加新值
    if (existingKey) {
        if (!Array.isArray(targetObj[existingKey])) {
            targetObj[existingKey] = [targetObj[existingKey]];
        }
        // 根据是否为特殊标记来决定是否转换为数字
        if (isIdentifier || (typeof value === 'string' && (value.startsWith('>') || value.startsWith('<')))) {
            targetObj[existingKey].push(value);
        } else {
            targetObj[existingKey].push(parseFloat(value));
        }
    } else {
        // 根据是否为特殊标记来决定是否转换为数字
        if (isIdentifier || (typeof value === 'string' && (value.startsWith('>') || value.startsWith('<')))) {
            targetObj[key] = value;
        } else {
            targetObj[key] = parseFloat(value);
        }
    }
};

/**
 * 加载默认测试文件
 */
export const loadDefaultTestFile = () => {
    try {
        // 创建XMLHttpRequest对象来加载本地测试文件
        const xhr = new XMLHttpRequest();
        // 使用相对路径加载测试文件
        xhr.open('GET', './测试数据.xlsx', true);
        xhr.responseType = 'arraybuffer';
        xhr.timeout = 10000; // 设置10秒超时
        
        xhr.onload = function(e) {
            if (xhr.status === 200) {
                try {
                    // 检查响应数据
                    if (!xhr.response) {
                        throw new Error('文件响应为空');
                    }
                    
                    // 将文件数据转换为Uint8Array格式
                    const data = new Uint8Array(xhr.response);
                    console.log('文件大小:', data.length, '字节');
                    
                    if (data.length === 0) {
                        throw new Error('文件内容为空');
                    }
                    
                    // 使用SheetJS读取Excel工作簿
                    const workbook = XLSX.read(data, { type: 'array' });
                    console.log('工作簿:', workbook);
                    
                    // 检查是否有工作表
                    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                        throw new Error('Excel文件中没有找到工作表');
                    }
                    
                    // 将工作簿转换为JSON格式
                    const sheetNames = workbook.SheetNames;
                    const dataMap = {};

                    sheetNames.forEach(name => {
                        const worksheet = workbook.Sheets[name];
                        // 将工作表转换为JSON数据（使用默认的header设置，这样会包含列名）
                        const jsonData = XLSX.utils.sheet_to_json(worksheet);
                        dataMap[name] = jsonData;
                    });

                    setState({
                        file: { name: '测试数据.xlsx', size: data.length },
                        workbook: workbook,
                        sheetNames: sheetNames,
                        data: dataMap,
                        activeSheetName: sheetNames[0]
                    });

                    processAllSheets(); // 处理所有工作表
                    
                } catch (error) {
                    // 处理文件读取或解析错误
                    console.error('读取默认测试文件时出错:', error);
                    alert('读取默认测试文件时出错: ' + error.message);
                }
            } else {
                console.error('无法加载默认测试文件，状态码:', xhr.status);
                alert('无法加载默认测试文件，请确保文件存在且可访问，错误代码: ' + xhr.status);
            }
        };
        
        xhr.onerror = function() {
            console.error('加载默认测试文件失败');
            alert('加载默认测试文件失败，请检查文件路径和服务器配置');
        };
        
        xhr.ontimeout = function() {
            console.error('加载默认测试文件超时');
            alert('加载默认测试文件超时，请检查网络连接');
        };
        
        xhr.send();
    } catch (error) {
        console.error('加载默认测试文件时发生异常:', error);
        alert('加载默认测试文件时发生异常: ' + error.message);
    }
};

/**
 * 处理用户选择的Excel文件
 * 1. 检查是否选择了文件
 * 2. 使用FileReader读取文件
 * 3. 解析Excel文件并显示结果
 */
export const handleFileUpload = async (file) => {
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            const sheetNames = workbook.SheetNames;
            const dataMap = {};

            sheetNames.forEach(name => {
                const worksheet = workbook.Sheets[name];
                // 将工作表转换为JSON数据（使用默认的header设置，这样会包含列名）
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                dataMap[name] = jsonData;
            });

            setState({
                file: { name: file.name, size: file.size },
                workbook: workbook,
                sheetNames: sheetNames,
                data: dataMap,
                activeSheetName: sheetNames[0]
            });

            processAllSheets(); // 处理所有工作表

        } catch (error) {
            console.error("Parsing error", error);
            alert("无法读取文件，请确认格式正确。");
        }
    };

    reader.readAsArrayBuffer(file);
};

/**
 * 处理所有工作表的数据（预先合并所有工作表的数据）
 */
export const processAllSheets = () => {
    const { data, activeSheetName, config } = getState();
    
    if (!data) return;

    // 处理所有工作表的数据合并
    let allMergedData = {};
    
    // 遍历所有工作表
    Object.keys(data).forEach(sheetName => {
        const rawData = data[sheetName];
        allMergedData[sheetName] = [];
        
        // 遍历工作表中的每一行数据
        for (let index = 0; index < rawData.length; index++) {
            const row = rawData[index];
            if (row['型号']) {
                // 创建一个新的合并对象，包含当前行和往后两条数据的所有参数
                const mergedRow = {};
                
                // 合并当前行数据（过滤空值）
                for (const key in row) {
                    if (row[key] !== null && row[key] !== undefined && row[key] !== '') {
                        // 检查是否为型号或批次字段
                        const isIdentifier = (key === '型号' || key === '批次');
                        mergeFieldValue(mergedRow, key, row[key], isIdentifier);
                    }
                }
                
                // 合并下一行数据（过滤空值）
                if (index + 1 < rawData.length) {
                    const nextRow = rawData[index + 1];
                    for (const key in nextRow) {
                        if (nextRow[key] !== null && nextRow[key] !== undefined && nextRow[key] !== '') {
                            // 检查是否为型号或批次字段
                            const isIdentifier = (key === '型号' || key === '批次');
                            mergeFieldValue(mergedRow, key, nextRow[key], isIdentifier);
                        }
                    }
                }
                
                // 合并下两行数据（过滤空值）
                if (index + 2 < rawData.length) {
                    const nextNextRow = rawData[index + 2];
                    for (const key in nextNextRow) {
                        if (nextNextRow[key] !== null && nextNextRow[key] !== undefined && nextNextRow[key] !== '') {
                            // 检查是否为型号或批次字段
                            const isIdentifier = (key === '型号' || key === '批次');
                            mergeFieldValue(mergedRow, key, nextNextRow[key], isIdentifier);
                        }
                    }
                }
                
                // 将合并后的对象添加到结果数组中
                allMergedData[sheetName].push(mergedRow);
                
                // 跳过已处理的行
                index += 2;
            }
        }
    });

    // 更新状态，保存所有合并后的数据
    setState({
        originalMergedData: allMergedData
    });
    
    // 处理当前活动工作表的显示数据
    processActiveSheet();
};

/**
 * 处理当前活动工作表的数据
 */
export const processActiveSheet = () => {
    const { originalMergedData, activeSheetName, config } = getState();
    
    if (!activeSheetName || !originalMergedData[activeSheetName]) return;

    // 获取当前活动工作表的合并数据
    let currentSheetData = originalMergedData[activeSheetName];
    
    // 应用搜索过滤（只对型号列进行搜索）
    let filteredData = currentSheetData;
    if (config.searchQuery) {
        filteredData = filterData(currentSheetData, config.searchQuery, config.isPreciseSearch);
    }

    setState({
        processedData: filteredData,
        pagination: { ...getState().pagination, currentPage: 1, totalItems: filteredData.length }
    });
};

/**
 * 通用搜索过滤函数（只对型号列进行搜索）
 * @param {Array} data - 数据数组
 * @param {string} searchTerm - 搜索词
 * @param {boolean} isPrecise - 是否为精准查询
 * @returns {Array} 过滤后的数据
 */
export const filterData = (data, searchTerm, isPrecise = false) => {
    if (!searchTerm) {
        return data;
    }
    
    // 过滤数据 - 只在型号字段中搜索
    return data.filter(row => {
        // 只检查型号字段是否包含搜索词（不区分大小写）
        const model = row['型号'] ? row['型号'].toString() : '';
        
        if (isPrecise) {
            // 精准查询：必须完全匹配
            return model.toLowerCase() === searchTerm.toLowerCase();
        } else {
            // 模糊查询：包含即可
            return model.toLowerCase().includes(searchTerm.toLowerCase());
        }
    });
};

/**
 * 处理精准查询
 */
export const handlePreciseSearch = () => {
    const { config } = getState();
    setState({ config: { ...config, isPreciseSearch: true } });
    processActiveSheet();
};