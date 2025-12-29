// 配置管理模块 - 基于 utools.dbStorage
window.AppConfig = {
  // 默认配置
  defaultConfig: {
    dataFolderPath: '',                    // 数据根目录
    currentGroup: '随便算算',               // 当前选中的分组
    groups: ['随便算算'],                   // 分组列表
    autoSave: false,                       // 是否开启自动保存
    autoSaveInterval: 60,                  // 自动保存间隔(秒)
    keepVersionDays: 7,                    // 保留版本天数
    fontSize: 20,                          // 编辑器字号
    initialized: false                     // 是否已初始化
  },

  // 获取配置
  getConfig: function() {
    try {
      const config = utools.dbStorage.getItem('app_config');
      if (!config) {
        return { ...this.defaultConfig };
      }
      // 合并默认配置，确保新增字段有默认值
      return { ...this.defaultConfig, ...config };
    } catch (e) {
      console.error('获取配置失败:', e);
      return { ...this.defaultConfig };
    }
  },

  // 保存配置
  setConfig: function(config) {
    try {
      utools.dbStorage.setItem('app_config', config);
      return { success: true };
    } catch (e) {
      console.error('保存配置失败:', e);
      return { success: false, error: e.message };
    }
  },

  // 更新部分配置
  updateConfig: function(updates) {
    try {
      const config = this.getConfig();
      const newConfig = { ...config, ...updates };
      this.setConfig(newConfig);
      return { success: true, config: newConfig };
    } catch (e) {
      console.error('更新配置失败:', e);
      return { success: false, error: e.message };
    }
  },

  // 重置配置
  resetConfig: function() {
    try {
      utools.dbStorage.removeItem('app_config');
      return { success: true };
    } catch (e) {
      console.error('重置配置失败:', e);
      return { success: false, error: e.message };
    }
  },

  // 添加分组
  addGroup: function(groupName) {
    try {
      const config = this.getConfig();
      if (config.groups.includes(groupName)) {
        return { success: false, error: '分组已存在' };
      }
      config.groups.push(groupName);
      this.setConfig(config);
      return { success: true, groups: config.groups };
    } catch (e) {
      console.error('添加分组失败:', e);
      return { success: false, error: e.message };
    }
  },

  // 删除分组
  removeGroup: function(groupName) {
    try {
      const config = this.getConfig();
      const index = config.groups.indexOf(groupName);
      if (index === -1) {
        return { success: false, error: '分组不存在' };
      }
      if (config.groups.length === 1) {
        return { success: false, error: '至少保留一个分组' };
      }
      config.groups.splice(index, 1);
      // 如果删除的是当前分组，切换到第一个分组
      if (config.currentGroup === groupName) {
        config.currentGroup = config.groups[0];
      }
      this.setConfig(config);
      return { success: true, groups: config.groups, currentGroup: config.currentGroup };
    } catch (e) {
      console.error('删除分组失败:', e);
      return { success: false, error: e.message };
    }
  },

  // 切换当前分组
  switchGroup: function(groupName) {
    try {
      const config = this.getConfig();
      if (!config.groups.includes(groupName)) {
        return { success: false, error: '分组不存在' };
      }
      config.currentGroup = groupName;
      this.setConfig(config);
      return { success: true, currentGroup: groupName };
    } catch (e) {
      console.error('切换分组失败:', e);
      return { success: false, error: e.message };
    }
  },

  // 初始化数据文件夹
  initializeDataFolder: function(folderPath) {
    try {
      const config = this.getConfig();
      config.dataFolderPath = folderPath;
      config.initialized = true;

      // 创建默认分组文件夹
      config.groups.forEach(groupName => {
        window.services.createGroup(folderPath, groupName);
      });

      this.setConfig(config);
      return { success: true };
    } catch (e) {
      console.error('初始化数据文件夹失败:', e);
      return { success: false, error: e.message };
    }
  }
};
