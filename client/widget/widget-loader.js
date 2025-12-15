/**
 * 🔱 ArkWidget Loader
 * <script> タグでロードされる外部JS
 * 
 * 使用方法:
 * <script src="https://tenmon-ai.com/widget-loader.js"></script>
 * <script>
 *   createTenmonWidget({
 *     siteId: "example-com",
 *     selector: "#widget-container"
 *   });
 * </script>
 */

(function() {
  'use strict';

  /**
   * TENMON-ARK Widget を作成
   * 
   * @param {Object} opts - オプション
   * @param {string} opts.siteId - サイトID（必須）
   * @param {string} opts.selector - 埋め込み先のセレクタ（必須）
   * @param {string} opts.frameUrl - iframeのURL（オプション、デフォルト: /widget-frame.html）
   * @param {number} opts.height - iframeの高さ（オプション、デフォルト: 600）
   * @param {number} opts.width - iframeの幅（オプション、デフォルト: 100%）
   */
  window.createTenmonWidget = function(opts) {
    if (!opts || !opts.siteId) {
      console.error('[TENMON Widget] siteId is required');
      return;
    }

    if (!opts.selector) {
      console.error('[TENMON Widget] selector is required');
      return;
    }

    const container = document.querySelector(opts.selector);
    if (!container) {
      console.error('[TENMON Widget] Container not found:', opts.selector);
      return;
    }

    // iframeを作成
    const iframe = document.createElement('iframe');
    const frameUrl = opts.frameUrl || '/widget-frame.html';
    const siteId = encodeURIComponent(opts.siteId);
    const height = opts.height || 600;
    const width = opts.width || '100%';

    iframe.src = `${frameUrl}?siteId=${siteId}`;
    iframe.style.width = typeof width === 'number' ? `${width}px` : width;
    iframe.style.height = `${height}px`;
    iframe.style.border = 'none';
    iframe.style.borderRadius = '0.5rem';
    iframe.setAttribute('allow', 'microphone');
    iframe.setAttribute('title', 'TENMON-ARK Widget');

    // コンテナに追加
    container.appendChild(iframe);

    console.log('[TENMON Widget] Widget created:', { siteId, selector: opts.selector });

    return {
      destroy: function() {
        if (container.contains(iframe)) {
          container.removeChild(iframe);
        }
      },
      updateHeight: function(newHeight) {
        iframe.style.height = `${newHeight}px`;
      },
    };
  };

  // 自動初期化（data-tenmon-widget属性がある場合）
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAutoWidgets);
  } else {
    initAutoWidgets();
  }

  function initAutoWidgets() {
    const widgets = document.querySelectorAll('[data-tenmon-widget]');
    widgets.forEach(function(element) {
      const siteId = element.getAttribute('data-tenmon-widget');
      const selector = '#' + element.id || element.className.split(' ')[0];
      
      if (siteId) {
        window.createTenmonWidget({
          siteId: siteId,
          selector: selector,
        });
      }
    });
  }
})();

