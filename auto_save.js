// 自动保存模块
window.AutoSave = {
  timerId: null,
  lastSavedHash: '',
  isEnabled: false,

  // 计算内容的简单 hash
  calculateHash: function(text, images) {
    const content = text + '|' + images.join('|');
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  },

  // 检查内容是否有变化
  hasContentChanged: function(text, images) {
    const currentHash = this.calculateHash(text, images);
    if (currentHash !== this.lastSavedHash) {
      this.lastSavedHash = currentHash;
      return true;
    }
    return false;
  },

  // 启动自动保存
  start: function(intervalSeconds, saveCallback) {
    this.stop(); // 先停止之前的定时器

    this.isEnabled = true;
    console.log(`自动保存已启动，间隔 ${intervalSeconds} 秒`);

    this.timerId = setInterval(() => {
      if (this.isEnabled && saveCallback) {
        saveCallback();
      }
    }, intervalSeconds * 1000);
  },

  // 停止自动保存
  stop: function() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isEnabled = false;
    console.log('自动保存已停止');
  },

  // 更新最后保存的 hash
  updateLastSavedHash: function(text, images) {
    this.lastSavedHash = this.calculateHash(text, images);
  }
};
