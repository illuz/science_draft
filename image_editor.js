// --- 变量定义 ---
const editorPanel = document.getElementById('editor-panel');
const canvas = document.getElementById('drawing-board');
const ctx = canvas.getContext('2d');

let currentImgElement = null;
let isDrawing = false;
let startX, startY;
let snapshot = null; 
let undoStack = [];
let currentTool = 'pen';
let currentColor = 'red';
let currentLineWidth = 3;

// --- 1. 面板控制 (分屏逻辑) ---
window.ImageEditor = {
    open: (imgElement) => {
        currentImgElement = imgElement;
        
        // 激活分屏
        editorPanel.classList.add('active');
        
        // 如果侧边栏开着，可以考虑暂时收起，或者保持。
        // 为了空间最大化，这里我们可以让编辑器占大头。
        
        const img = new Image();
        img.src = imgElement.src;
        img.onload = () => {
            // 设置 Canvas 尺寸 (保持原图比例，但限制最大宽度以免撑爆)
            // 这里我们用原图尺寸，靠外层 div 的 overflow: auto 来滚动
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            
            ctx.drawImage(img, 0, 0);
            undoStack = [canvas.toDataURL()];
        };
    },
    close: () => {
        editorPanel.classList.remove('active');
        currentImgElement = null;
    },
    save: () => {
        if (currentImgElement) {
            currentImgElement.src = canvas.toDataURL('image/png');
            // 触发自动保存
            if(window.saveDataTrigger) window.saveDataTrigger();
        }
        window.ImageEditor.close();
    }
};

// --- 2. 绘图逻辑 (保持不变，只是坐标计算由于布局变化可能需要微调) ---

function getPos(e) {
    // getBoundingClientRect 会返回 canvas 在当前视口中的实际大小和位置
    const rect = canvas.getBoundingClientRect();
    return {
        // 计算鼠标在 Canvas 内部的像素坐标
        // (鼠标位置 - 画布左上角) * (画布实际分辨率 / 画布显示宽度)
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height)
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
        const headLen = 15 + currentLineWidth; // 箭头随线宽变大
        ctx.moveTo(tox, toy);
        ctx.lineTo(tox - headLen * Math.cos(angle - Math.PI / 6), toy - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(tox, toy);
        ctx.lineTo(tox - headLen * Math.cos(angle + Math.PI / 6), toy - headLen * Math.sin(angle + Math.PI / 6));
    }
    else if (tool === 'rect') {
        ctx.strokeRect(sx, sy, dx, dy);
        return;
    }
    else if (tool === 'circle') {
        let r = Math.sqrt(dx*dx + dy*dy) / 2;
        let cx = sx + dx / 2;
        let cy = sy + dy / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    }
    ctx.stroke();
}

// 鼠标事件
canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    const pos = getPos(e);
    startX = pos.x; startY = pos.y;
    snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    if (currentTool === 'pen' || currentTool === 'eraser') {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    const pos = getPos(e);
    
    if (currentTool === 'pen' || currentTool === 'eraser') {
        ctx.lineWidth = (currentTool === 'eraser') ? 25 : currentLineWidth;
        ctx.strokeStyle = (currentTool === 'eraser') ? '#fff' : currentColor;
        ctx.lineCap = 'round';
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
        undoStack.push(canvas.toDataURL());
    }
});

// --- 3. UI绑定 ---
document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        currentTool = e.currentTarget.dataset.tool;
    });
});

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

document.getElementById('btn-undo').onclick = () => {
    if (undoStack.length > 1) {
        undoStack.pop();
        let prev = undoStack[undoStack.length - 1];
        let img = new Image(); img.src = prev; img.onload = () => {
            ctx.clearRect(0,0,canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
    }
};
document.getElementById('btn-clear').onclick = () => {
    if (undoStack.length > 0) {
        let origin = undoStack[0];
        let img = new Image(); img.src = origin; img.onload = () => {
            ctx.clearRect(0,0,canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            undoStack.push(canvas.toDataURL());
        };
    }
};

document.getElementById('btn-save-edit').onclick = window.ImageEditor.save;
document.getElementById('btn-close-edit').onclick = window.ImageEditor.close;
