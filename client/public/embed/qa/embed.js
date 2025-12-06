/**
 * TENMON-ARK LP-QA Widget Embed Script
 * LP用軽量Q&Aチャットウィジェット埋め込みスクリプト
 */

(function() {
  'use strict';

  // 設定
  const config = {
    // 本番環境のURL（デプロイ後に変更）
    baseUrl: window.location.origin,
    // iframe URL
    iframeUrl: '/embed/qa',
    // デフォルトの幅・高さ
    defaultWidth: '100%',
    defaultHeight: '600px',
    // デフォルトのボーダー
    defaultBorder: 'none',
    // デフォルトのボーダーラジアス
    defaultBorderRadius: '8px',
  };

  /**
   * ウィジェットを初期化
   */
  function initWidget() {
    // ウィジェットコンテナを取得
    const container = document.getElementById('tenmon-ark-qa-widget');
    if (!container) {
      console.error('[TENMON-ARK] Widget container not found');
      return;
    }

    // カスタム設定を取得
    const width = container.getAttribute('data-width') || config.defaultWidth;
    const height = container.getAttribute('data-height') || config.defaultHeight;
    const border = container.getAttribute('data-border') || config.defaultBorder;
    const borderRadius = container.getAttribute('data-border-radius') || config.defaultBorderRadius;

    // iframeを作成
    const iframe = document.createElement('iframe');
    iframe.src = config.baseUrl + config.iframeUrl;
    iframe.style.width = width;
    iframe.style.height = height;
    iframe.style.border = border;
    iframe.style.borderRadius = borderRadius;
    iframe.style.display = 'block';
    iframe.setAttribute('allowtransparency', 'true');
    iframe.setAttribute('scrolling', 'no');

    // コンテナにiframeを追加
    container.appendChild(iframe);

    console.log('[TENMON-ARK] Widget initialized');
  }

  // DOMContentLoadedイベントでウィジェットを初期化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
})();
