const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

window.services = {
  // 1. 选择文件夹
  selectFolder: () => {
    const result = utools.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: '请选择保存位置'
    });
    return result ? result[0] : null;
  },

  // 2. 初始化数据根目录
  initDataFolder: (folderPath) => {
    try {
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  // 3. 创建分组文件夹
  createGroup: (dataFolderPath, groupName) => {
    try {
      const groupPath = path.join(dataFolderPath, groupName);
      if (!fs.existsSync(groupPath)) {
        fs.mkdirSync(groupPath, { recursive: true });
      }
      return { success: true, path: groupPath };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  // 4. 删除分组
  deleteGroup: (dataFolderPath, groupName) => {
    try {
      const groupPath = path.join(dataFolderPath, groupName);
      if (fs.existsSync(groupPath)) {
        fs.rmSync(groupPath, { recursive: true, force: true });
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  // 5. 列出所有分组
  listGroups: (dataFolderPath) => {
    try {
      if (!fs.existsSync(dataFolderPath)) {
        return { success: true, groups: [] };
      }
      const items = fs.readdirSync(dataFolderPath);
      const groups = items.filter(item => {
        const itemPath = path.join(dataFolderPath, item);
        return fs.statSync(itemPath).isDirectory();
      });
      return { success: true, groups };
    } catch (e) {
      return { success: false, error: e.message, groups: [] };
    }
  },

  // 6. 保存到分组 (带备份功能)
  saveToGroup: (dataFolderPath, groupName, textContent, images) => {
    try {
      const groupPath = path.join(dataFolderPath, groupName);
      if (!fs.existsSync(groupPath)) {
        fs.mkdirSync(groupPath, { recursive: true });
      }

      const now = new Date();
      const timeStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;

      // 检查内容是否有变化
      const draftPath = path.join(groupPath, 'draft.txt');
      let contentChanged = false;

      if (fs.existsSync(draftPath)) {
        const oldContent = fs.readFileSync(draftPath, 'utf-8');
        const oldHash = crypto.createHash('md5').update(oldContent).digest('hex');
        const newHash = crypto.createHash('md5').update(textContent || '').digest('hex');
        contentChanged = (oldHash !== newHash);

        // 只有内容变化时才创建备份
        if (contentChanged) {
          const backupDraftPath = path.join(groupPath, `draft_bak_${timeStr}.txt`);
          fs.copyFileSync(draftPath, backupDraftPath);
        }
      } else {
        // 文件不存在，视为有变化
        contentChanged = true;
      }

      // 保存新的 draft.txt
      fs.writeFileSync(draftPath, textContent || '', 'utf-8');

      // 备份旧的 project.json (只在内容变化时)
      const projectPath = path.join(groupPath, 'project.json');
      if (contentChanged && fs.existsSync(projectPath)) {
        const backupProjectPath = path.join(groupPath, `project_bak_${timeStr}.json`);
        fs.copyFileSync(projectPath, backupProjectPath);
      }

      // 保存图片
      const imageManifest = [];
      let imagesChanged = false;

      images.forEach((base64Data, index) => {
        const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, "");
        const imgId = `img${index + 1}`;
        const originFileName = `${imgId}_origin.png`;
        const originPath = path.join(groupPath, originFileName);

        // 如果原始图片不存在，创建它
        if (!fs.existsSync(originPath)) {
          fs.writeFileSync(originPath, Buffer.from(base64Image, 'base64'));
          imageManifest.push(originFileName);
          imagesChanged = true;
        } else {
          // 检查图片是否有变化
          const existingImage = fs.readFileSync(originPath);
          const newImageBuffer = Buffer.from(base64Image, 'base64');

          if (!existingImage.equals(newImageBuffer)) {
            // 图片有变化，只在内容也变化时才创建新版本
            if (contentChanged) {
              const versionFileName = `${imgId}_${timeStr}.png`;
              fs.writeFileSync(path.join(groupPath, versionFileName), newImageBuffer);
              imageManifest.push(versionFileName);
            } else {
              // 内容没变但图片变了，更新原始图片
              fs.writeFileSync(originPath, newImageBuffer);
              imageManifest.push(originFileName);
            }
            imagesChanged = true;
          } else {
            // 图片没变化，使用原始版本
            imageManifest.push(originFileName);
          }
        }
      });

      // 保存新的 project.json
      const projectData = {
        version: "2.0",
        created: now.toLocaleString(),
        images: imageManifest
      };
      fs.writeFileSync(projectPath, JSON.stringify(projectData, null, 2), 'utf-8');

      return {
        success: true,
        path: groupPath,
        contentChanged: contentChanged,
        imagesChanged: imagesChanged
      };
    } catch (e) {
      console.error(e);
      return { success: false, error: e.message };
    }
  },

  // 7. 从分组加载
  loadFromGroup: (dataFolderPath, groupName) => {
    try {
      const groupPath = path.join(dataFolderPath, groupName);
      if (!fs.existsSync(groupPath)) {
        return { success: true, data: { text: '', images: [] } };
      }

      // 读取文本
      const textPath = path.join(groupPath, 'draft.txt');
      let text = fs.existsSync(textPath) ? fs.readFileSync(textPath, 'utf-8') : "";

      // 读取图片
      const images = [];
      const projectPath = path.join(groupPath, 'project.json');

      if (fs.existsSync(projectPath)) {
        const projectData = JSON.parse(fs.readFileSync(projectPath, 'utf-8'));
        (projectData.images || []).forEach(f => {
          const p = path.join(groupPath, f);
          if(fs.existsSync(p)) {
            images.push('data:image/png;base64,' + fs.readFileSync(p).toString('base64'));
          }
        });
      } else {
        // 兼容模式：读取所有 origin 图片
        const files = fs.readdirSync(groupPath);
        files.filter(f => f.includes('_origin.png')).forEach(f => {
          images.push('data:image/png;base64,' + fs.readFileSync(path.join(groupPath, f)).toString('base64'));
        });
      }

      return { success: true, data: { text, images } };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  // 8. 清理过期版本文件
  cleanOldVersions: (dataFolderPath, keepDays) => {
    try {
      if (!fs.existsSync(dataFolderPath)) {
        return { success: true, cleaned: 0 };
      }

      const cutoffTime = Date.now() - (keepDays * 24 * 60 * 60 * 1000);
      let cleanedCount = 0;

      const groups = fs.readdirSync(dataFolderPath);
      groups.forEach(groupName => {
        const groupPath = path.join(dataFolderPath, groupName);
        if (!fs.statSync(groupPath).isDirectory()) return;

        const files = fs.readdirSync(groupPath);
        files.forEach(fileName => {
          // 只清理备份文件
          if (fileName.includes('_bak_') || (fileName.includes('img') && !fileName.includes('_origin'))) {
            const filePath = path.join(groupPath, fileName);
            const stats = fs.statSync(filePath);

            if (stats.mtimeMs < cutoffTime) {
              fs.unlinkSync(filePath);
              cleanedCount++;
            }
          }
        });
      });

      return { success: true, cleaned: cleanedCount };
    } catch (e) {
      return { success: false, error: e.message, cleaned: 0 };
    }
  },

  // 9. 保存到文件夹 (旧版本，保留兼容性)
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
