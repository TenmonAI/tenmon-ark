/**
 * 🔱 ArkWidget One-Line Embed
 * LPに1行で埋め込み可能なスクリプト
 * 
 * 使用方法:
 * <script src="https://tenmon-ai.com/widget/embed.js"></script>
 * <script>
 *   createTenmonWidget({
 *     siteId: "example-com",
 *     selector: "#widget-container"
 *   });
 * </script>
 * 
 * または、data属性を使用:
 * <div id="widget-container" data-tenmon-widget="example-com"></div>
 * <script src="https://tenmon-ai.com/widget/embed.js"></script>
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
   * @param {string|number} opts.width - iframeの幅（オプション、デフォルト: 100%）
   */
  window.createTenmonWidget = function(opts) {
    if (!opts || !opts.siteId) {
      console.error('[TENMON Widget] siteId is required');
      return null;
    }

    if (!opts.selector) {
      console.error('[TENMON Widget] selector is required');
      return null;
    }

    const container = document.querySelector(opts.selector);
    if (!container) {
      console.error('[TENMON Widget] Container not found:', opts.selector);
      return null;
    }

    // iframeを作成
    const iframe = document.createElement('iframe');
    const frameUrl = opts.frameUrl || '/widget-frame.html';
    const siteId = encodeURIComponent(opts.siteId);
    const height = opts.height || 600;
    const width = opts.width || '100%';

    iframe.src = frameUrl + '?siteId=' + siteId;
    iframe.style.width = typeof width === 'number' ? width + 'px' : width;
    iframe.style.height = height + 'px';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '0.5rem';
    iframe.setAttribute('allow', 'microphone');
    iframe.setAttribute('title', 'TENMON-ARK Widget');
    iframe.setAttribute('loading', 'lazy');

    // コンテナに追加
    container.appendChild(iframe);

    console.log('[TENMON Widget] Widget created:', { siteId: opts.siteId, selector: opts.selector });

    // Widgetインスタンスを返す（destroy/updateHeightメソッド付き）
    return {
      destroy: function() {
        if (container.contains(iframe)) {
          container.removeChild(iframe);
        }
      },
      updateHeight: function(newHeight) {
        iframe.style.height = newHeight + 'px';
      },
      updateSiteId: function(newSiteId) {
        const newSiteIdEncoded = encodeURIComponent(newSiteId);
        iframe.src = frameUrl + '?siteId=' + newSiteIdEncoded;
      },
    };
  };

  // 自動初期化（data-tenmon-widget属性がある場合）
  function initAutoWidgets() {
    const widgets = document.querySelectorAll('[data-tenmon-widget]');
    widgets.forEach(function(element) {
      const siteId = element.getAttribute('data-tenmon-widget');
      const selector = element.id ? '#' + element.id : '.' + element.className.split(' ')[0];
      
      if (siteId) {
        window.createTenmonWidget({
          siteId: siteId,
          selector: selector,
        });
      }
    });
  }

  // DOMContentLoadedまたは即座に実行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAutoWidgets);
  } else {
    initAutoWidgets();
  }
})();

