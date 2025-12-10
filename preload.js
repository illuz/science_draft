const fs = require('fs');
const path = require('path');

window.services = {
  // 1. 选择文件夹
  selectFolder: () => {
    const result = utools.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: '请选择保存位置'
    });
    return result ? result[0] : null;
  },

  // 2. 保存到文件夹 (自动创建日期子文件夹)
  saveToFolder: (parentPath, textContent, images) => {
    try {
      if (!parentPath) return { success: false, error: "未选择路径" };

      // 生成带时间戳的文件夹名
      const now = new Date();
      const timeStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
      const folderName = `${timeStr}_草稿计算器`;
      const targetPath = path.join(parentPath, folderName);

      if (!fs.existsSync(targetPath)) fs.mkdirSync(targetPath, { recursive: true });

      // 保存文本
      fs.writeFileSync(path.join(targetPath, 'draft.txt'), textContent || '', 'utf-8');

      // 保存图片
      const imageManifest = [];
      images.forEach((base64Data, index) => {
        const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, "");
        const fileName = `img_${index + 1}.png`;
        fs.writeFileSync(path.join(targetPath, fileName), Buffer.from(base64Image, 'base64'));
        imageManifest.push(fileName);
      });

      // 保存索引
      const indexData = { version: "1.5", created: now.toLocaleString(), images: imageManifest };
      fs.writeFileSync(path.join(targetPath, 'project.json'), JSON.stringify(indexData, null, 2), 'utf-8');

      return { success: true, newPath: targetPath };
    } catch (e) {
      console.error(e);
      return { success: false, error: e.message };
    }
  },

  // 3. 读取文件夹
  loadFromFolder: (folderPath) => {
    try {
      // 容错处理
      let targetDir = folderPath;
      if (fs.statSync(folderPath).isFile()) targetDir = path.dirname(folderPath);

      // 读取文本
      const textPath = path.join(targetDir, 'draft.txt');
      let text = fs.existsSync(textPath) ? fs.readFileSync(textPath, 'utf-8') : "";

      // 读取图片
      const images = [];
      const indexPath = path.join(targetDir, 'project.json');
      
      if (fs.existsSync(indexPath)) {
        const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
        (indexData.images || []).forEach(f => {
            const p = path.join(targetDir, f);
            if(fs.existsSync(p)) images.push('data:image/png;base64,' + fs.readFileSync(p).toString('base64'));
        });
      } else {
        // 兼容模式
        fs.readdirSync(targetDir).forEach(f => {
            if (f.toLowerCase().endsWith('.png')) {
                images.push('data:image/png;base64,' + fs.readFileSync(path.join(targetDir, f)).toString('base64'));
            }
        });
      }
      return { success: true, data: { text, images } };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
};
