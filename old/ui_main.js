const editor = document.getElementById('editor');
const sidebar = document.getElementById('image-sidebar');
const DB_ID = 'science_draft_v3'; 
let isResultSelected = false;

// --- 绘图窗口通讯 ---
window.addEventListener('storage', (e) => {
    if (e.key === 'utools_paint_finished') {
        const p = JSON.parse(e.newValue);
        const img = document.querySelector(`img[data-id="${p.id}"]`);
        if(img) { 
            img.src = p.data; 
            saveDraft(); 
            img.parentElement.style.border="2px solid #2ecc71";
            setTimeout(()=>img.parentElement.style.border="2px solid transparent", 1000);
        }
        localStorage.removeItem('utools_paint_finished');
    }
});

// --- 输入监听 (计算 & 替换) ---
editor.addEventListener('input', (e) => {
    saveDraft();
    // 等号计算
    if (e.data === '=' || e.data === '＝') {
        const end = editor.selectionEnd;
        const text = editor.value.substring(0, end);
        const line = text.substring(text.lastIndexOf('\n') + 1, end - 1);
        if (window.MathLogic) {
            const res = window.MathLogic.calculate(line);
            if (res) {
                editor.setRangeText(res.startsWith(' ')?res:(' '+res), end, end, 'select');
                isResultSelected = true;
            }
        }
        return;
    }
    isResultSelected = false;
    // 符号替换
    if (e.inputType.startsWith("insert") && window.MathLogic) {
        const end = editor.selectionEnd;
        const val = editor.value;
        const before = val.substring(0, end);
        const after = val.substring(end);
        let n = val, off = 0;
        if (before.endsWith('*')) { n = before.slice(0,-1)+'×'+after; }
        else if (before.endsWith('/')) { n = before.slice(0,-1)+'÷'+after; }
        else if (before.endsWith('pi')) { n = before.slice(0,-2)+'π'+after; off=-1; }
        else if (before.endsWith('sqrt')) { n = before.slice(0,-4)+'√'+after; off=-3; }
        if (n !== val) { editor.value = n; editor.selectionStart = end+off; editor.selectionEnd = end+off; saveDraft(); }
    }
});

// --- 按键监听 ---
editor.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
        if (isResultSelected) { e.preventDefault(); editor.selectionStart = editor.selectionEnd; isResultSelected = false; }
        else { e.preventDefault(); document.execCommand('insertText', false, '\t'); }
    }
    if (e.key === ' ' && window.MathLogic) {
        const end = editor.selectionEnd;
        const match = editor.value.substring(0, end).match(/\^([0-9+\-n().]+)$/);
        if (match) {
            e.preventDefault();
            const conv = window.MathLogic.toSuperscript(match[1]);
            editor.setRangeText(conv + ' ', end - match[0].length, end, 'end');
            saveDraft();
        }
    }
});

// --- 文件夹操作 ---
document.getElementById('btn-save-folder').onclick = () => {
    if(!window.services) { alert("插件加载异常，请重启uTools"); return; }
    const path = window.services.selectFolder();
    if(!path) return;
    const imgs = []; document.querySelectorAll('#image-sidebar img').forEach(i => imgs.push(i.src));
    const res = window.services.saveToFolder(path, editor.value, imgs);
    if(res.success) utools.showNotification("已保存到: " + res.newPath);
    else alert("失败:" + res.error);
};
document.getElementById('btn-open-folder').onclick = () => {
    if(!window.services) return;
    const path = window.services.selectFolder();
    if(!path) return;
    const res = window.services.loadFromFolder(path);
    if(res.success) {
        editor.value = res.data.text;
        sidebar.innerHTML = '<div class="sidebar-tip">Ctrl+V 粘贴图片<br>双击在新窗口编辑</div>';
        res.data.images.forEach(addImageToSidebar);
        if(res.data.images.length) sidebar.classList.add('active');
        saveDraft();
        utools.showNotification("导入成功");
    } else alert("失败:" + res.error);
};

// --- 图片管理 ---
function addImageToSidebar(src) {
    const div = document.createElement('div'); div.className = 'img-card';
    const id = Date.now() + Math.random().toString(36).substr(2, 5);
    div.innerHTML = `<img src="${src}" data-id="${id}"><div class="del-btn">×</div><div class="edit-hint">双击编辑</div>`;
    div.ondblclick = () => {
        if(!window.utools) return;
        localStorage.setItem('utools_paint_request', JSON.stringify({id, src}));
        utools.createBrowserWindow('editor.html', { title: '绘图板', width: 1000, height: 800, resizable: true, webPreferences: {nodeIntegration: true} });
    };
    div.querySelector('.del-btn').onclick = (e) => { e.stopPropagation(); div.remove(); saveDraft(); };
    sidebar.appendChild(div);
}
document.addEventListener('paste', (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let i in items) {
        if (items[i].kind === 'file' && items[i].type.includes('image/')) {
            const reader = new FileReader();
            reader.onload = (evt) => { addImageToSidebar(evt.target.result); saveDraft(); sidebar.classList.add('active'); };
            reader.readAsDataURL(items[i].getAsFile());
        }
    }
});

// --- 初始化 ---
document.getElementById('btn-sidebar').onclick = () => sidebar.classList.toggle('active');
document.getElementById('btn-help').onclick = () => document.getElementById('help-modal').style.display = 'flex';

function saveDraft() {
   if(!window.utools) return;
   const imgs = []; document.querySelectorAll('#image-sidebar img').forEach(i => imgs.push(i.src));
   utools.db.put({ _id: DB_ID, data: { text: editor.value, images: imgs }, _rev: utools.db.get(DB_ID)?._rev });
}
function loadDraft() {
   editor.placeholder = "输入 1+1= 计算...\n输入 x^-2 [空格] 变上标...";
   if(!window.utools) return;
   const doc = utools.db.get(DB_ID);
   if(doc && doc.data) {
       editor.value = doc.data.text||'';
       (doc.data.images||[]).forEach(addImageToSidebar);
       if(doc.data.images?.length) sidebar.classList.add('active');
   } else { document.getElementById('help-modal').style.display = 'flex'; }
}
if(window.utools) utools.onPluginEnter(() => { editor.focus(); loadDraft(); }); else loadDraft();
