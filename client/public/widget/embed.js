/**
 * ============================================================
 *  ARK WIDGET — One-Line Embed Script
 * ============================================================
 * 
 * 1行の <script> タグで埋め込み可能な Widget
 * 
 * 使用方法:
 * <script src="https://cdn.tenmon-ark.com/widget/embed.js" data-site-id="your-site-id"></script>
 * ============================================================
 */

(function() {
  'use strict';
  
  // 設定を取得
  const script = document.currentScript || document.querySelector('script[data-site-id]');
  const siteId = script?.getAttribute('data-site-id') || '';
  const apiUrl = script?.getAttribute('data-api-url') || 'https://api.tenmon-ark.com';
  
  if (!siteId) {
    console.error('TENMON-ARK Widget: data-site-id is required');
    return;
  }
  
  // Widget コンテナを作成
  const widgetContainer = document.createElement('div');
  widgetContainer.id = 'tenmon-ark-widget';
  widgetContainer.setAttribute('data-site-id', siteId);
  widgetContainer.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 400px;
    height: 600px;
    max-width: calc(100vw - 40px);
    max-height: calc(100vh - 40px);
    z-index: 9999;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    background: white;
    display: none;
  `;
  
  // Widget iframe を作成
  const iframe = document.createElement('iframe');
  iframe.src = `${apiUrl}/widget/frame?siteId=${siteId}`;
  iframe.style.cssText = `
    width: 100%;
    height: 100%;
    border: none;
    border-radius: 12px;
  `;
  iframe.setAttribute('allow', 'microphone');
  
  widgetContainer.appendChild(iframe);
  document.body.appendChild(widgetContainer);
  
  // トグルボタンを作成
  const toggleButton = document.createElement('button');
  toggleButton.innerHTML = '💬';
  toggleButton.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    font-size: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  
  let isOpen = false;
  toggleButton.addEventListener('click', function() {
    isOpen = !isOpen;
    widgetContainer.style.display = isOpen ? 'block' : 'none';
    toggleButton.style.display = isOpen ? 'none' : 'block';
  });
  
  document.body.appendChild(toggleButton);
  
  // グローバル API を公開
  window.TenmonArkWidget = {
    open: function() {
      isOpen = true;
      widgetContainer.style.display = 'block';
      toggleButton.style.display = 'none';
    },
    close: function() {
      isOpen = false;
      widgetContainer.style.display = 'none';
      toggleButton.style.display = 'block';
    },
    toggle: function() {
      toggleButton.click();
    },
  };
})();

