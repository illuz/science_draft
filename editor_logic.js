// 获取 DOM
const canvas = document.getElementById('main-canvas');
const ctx = canvas.getContext('2d');
const container = document.querySelector('.canvas-area');

// 状态变量
let currentId = null;
let currentTool = 'pen';
let currentColor = 'red';
let currentLineWidth = 3;
let isDrawing = false;
let startX, startY;
let snapshot = null;
let undoStack = [];

// --- 1. 初始化 ---
window.onload = () => {
    // 从 LocalStorage 读取请求数据
    const requestStr = localStorage.getItem('utools_paint_request');
    if (!requestStr) {
        alert("未找到图片数据，请从主界面进入");
        return;
    }
    const request = JSON.parse(requestStr);
    currentId = request.id;
    
    // 加载图片
    const img = new Image();
    img.src = request.src;
    img.onload = () => {
        // 设置画布大小
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        
        // 绘制原图
        ctx.drawImage(img, 0, 0);
        saveState(); // 保存初始状态
        
        // 自动适配缩放，让图片完整显示在窗口中 (视觉优化)
        fitCanvasToWindow();
    };

    // 清除请求数据，保持干净
    localStorage.removeItem('utools_paint_request');
};

function saveState() {
    undoStack.push(canvas.toDataURL());
    if (undoStack.length > 20) undoStack.shift();
}

function fitCanvasToWindow() {
    // 简单的缩放逻辑，实际绘图还是基于原始分辨率
    // 这里通过 CSS 控制显示大小，不影响 canvas.width
    const margin = 40;
    const availableW = container.clientWidth - margin;
    const availableH = container.clientHeight - margin;
    
    const scale = Math.min(
        1,
        availableW / canvas.width,
        availableH / canvas.height
    );
    
    canvas.style.width = (canvas.width * scale) + 'px';
    canvas.style.height = (canvas.height * scale) + 'px';
}

// 窗口大小改变时重新适配
window.onresize = fitCanvasToWindow;


// --- 2. 绘图逻辑 ---

function getPos(e) {
    // 获取鼠标在 Canvas 内部的真实坐标 (考虑了 CSS 缩放)
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

function drawShape(sx, sy, ex, ey, tool, shiftKey) {
    ctx.beginPath();
    ctx.strokeStyle = (tool === 'eraser') ? '#fff' : currentColor;
    ctx.lineWidth = (tool === 'eraser') ? 20 : currentLineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    let dx = ex - sx;
    let dy = ey - sy;

    // Shift 键约束
    if (shiftKey) {
        if (tool === 'line' || tool === 'arrow') {
             if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0;
        } else if (tool === 'rect' || tool === 'circle') {
             let len = Math.max(Math.abs(dx), Math.abs(dy));
             dx = (dx > 0 ? 1 : -1) * len;
             dy = (dy > 0 ? 1 : -1) * len;
        }
    }

    if (tool === 'line' || tool === 'pen') {
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + dx, sy + dy);
    } 
    else if (tool === 'arrow') {
        const tox = sx + dx; const toy = sy + dy;
        ctx.moveTo(sx, sy); ctx.lineTo(tox, toy);
        const angle = Math.atan2(dy, dx);
        const headLen = 15; 
        ctx.moveTo(tox, toy); ctx.lineTo(tox - headLen * Math.cos(angle - Math.PI / 6), toy - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(tox, toy); ctx.lineTo(tox - headLen * Math.cos(angle + Math.PI / 6), toy - headLen * Math.sin(angle + Math.PI / 6));
    }
    else if (tool === 'rect') {
        ctx.strokeRect(sx, sy, dx, dy); return;
    }
    else if (tool === 'circle') {
        let r = Math.sqrt(dx*dx + dy*dy) / 2;
        let cx = sx + dx / 2; let cy = sy + dy / 2;
        ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    }
    ctx.stroke();
}

canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    const pos = getPos(e);
    startX = pos.x; startY = pos.y;
    snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    if (currentTool === 'pen' || currentTool === 'eraser') {
        ctx.beginPath();
        ctx.strokeStyle = (currentTool === 'eraser') ? '#fff' : currentColor;
        ctx.lineWidth = (currentTool === 'eraser') ? 20 : currentLineWidth;
        ctx.lineCap = 'round';
        ctx.moveTo(startX, startY);
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    const pos = getPos(e);
    
    if (currentTool === 'pen' || currentTool === 'eraser') {
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    } else {
        ctx.putImageData(snapshot, 0, 0);
        drawShape(startX, startY, pos.x, pos.y, currentTool, e.shiftKey);
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (isDrawing) {
        isDrawing = false;
        if (currentTool !== 'pen' && currentTool !== 'eraser') {
             const pos = getPos(e);
             drawShape(startX, startY, pos.x, pos.y, currentTool, e.shiftKey);
        }
        saveState();
    }
});

// --- 3. 交互事件 ---

// 切换工具
document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        currentTool = e.currentTarget.dataset.tool;
    });
});

// 切换颜色
document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        currentColor = e.currentTarget.dataset.color;
        if (currentTool === 'eraser') {
             currentTool = 'pen';
             document.querySelector('[data-tool="eraser"]').classList.remove('active');
             document.querySelector('[data-tool="pen"]').classList.add('active');
        }
    });
});

// 撤销
document.getElementById('btn-undo').onclick = () => {
    if (undoStack.length > 1) {
        undoStack.pop();
        const prev = undoStack[undoStack.length - 1];
        const img = new Image(); img.src = prev;
        img.onload = () => { ctx.clearRect(0,0,canvas.width, canvas.height); ctx.drawImage(img, 0, 0); };
    }
};

// 清空
document.getElementById('btn-clear').onclick = () => {
    if (confirm("确定要清空所有标记吗？(包括原图)")) {
        ctx.fillStyle = "#fff";
        ctx.fillRect(0,0,canvas.width, canvas.height);
        saveState();
    }
};

// --- 4. 保存与关闭 ---

document.getElementById('btn-save').onclick = () => {
    const finalData = canvas.toDataURL('image/png');
    // 发送数据回主窗口
    localStorage.setItem('utools_paint_finished', JSON.stringify({
        id: currentId,
        data: finalData
    }));
    window.close(); // 关闭当前窗口
};

document.getElementById('btn-cancel').onclick = () => {
    window.close();
};
