/**
 * ark-floating.js - Floating Chat Widget Script
 * 
 * Usage:
 * <script src="https://tenmon-ai.com/embed/ark-floating.js"
 *         data-chat-url="https://tenmon-ai.com/embed/ark-chat-UNIQUE">
 * </script>
 */

(function() {
  'use strict';

  // Get chat URL from script tag
  const currentScript = document.currentScript || document.querySelector('script[data-chat-url]');
  const chatUrl = currentScript ? currentScript.getAttribute('data-chat-url') : null;

  if (!chatUrl) {
    console.error('[ARK Floating] data-chat-url attribute is required');
    return;
  }

  // Create floating button
  const button = document.createElement('button');
  button.id = 'ark-floating-button';
  button.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C6.48 2 2 6.48 2 12C2 13.93 2.6 15.72 3.63 17.19L2.05 21.95L7.08 20.42C8.47 21.24 10.18 21.75 12 21.75C17.52 21.75 22 17.27 22 11.75C22 6.23 17.52 2 12 2Z" fill="currentColor"/>
    </svg>
  `;
  button.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
    border: 2px solid #d4af37;
    color: #d4af37;
    cursor: pointer;
    box-shadow: 0 4px 20px rgba(212, 175, 55, 0.3);
    z-index: 999998;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
  `;

  // Hover effect
  button.addEventListener('mouseenter', () => {
    button.style.transform = 'scale(1.1)';
    button.style.boxShadow = '0 6px 30px rgba(212, 175, 55, 0.5)';
  });
  button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1)';
    button.style.boxShadow = '0 4px 20px rgba(212, 175, 55, 0.3)';
  });

  // Create iframe container
  const container = document.createElement('div');
  container.id = 'ark-floating-container';
  container.style.cssText = `
    position: fixed;
    bottom: 100px;
    right: 24px;
    width: 400px;
    height: 600px;
    border-radius: 16px;
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.4);
    z-index: 999999;
    display: none;
    overflow: hidden;
    border: 2px solid #d4af37;
  `;

  // Create iframe
  const iframe = document.createElement('iframe');
  iframe.src = chatUrl;
  iframe.style.cssText = `
    width: 100%;
    height: 100%;
    border: 0;
  `;
  iframe.allow = 'microphone; camera';

  container.appendChild(iframe);

  // Toggle chat
  let isOpen = false;
  button.addEventListener('click', () => {
    isOpen = !isOpen;
    container.style.display = isOpen ? 'block' : 'none';
    
    // Animate button
    if (isOpen) {
      button.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor"/>
        </svg>
      `;
    } else {
      button.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12C2 13.93 2.6 15.72 3.63 17.19L2.05 21.95L7.08 20.42C8.47 21.24 10.18 21.75 12 21.75C17.52 21.75 22 17.27 22 11.75C22 6.23 17.52 2 12 2Z" fill="currentColor"/>
        </svg>
      `;
    }
  });

  // Close on ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) {
      button.click();
    }
  });

  // Responsive design for mobile
  function updateMobileLayout() {
    if (window.innerWidth < 768) {
      container.style.width = 'calc(100vw - 32px)';
      container.style.height = 'calc(100vh - 120px)';
      container.style.right = '16px';
      container.style.bottom = '80px';
      button.style.right = '16px';
      button.style.bottom = '16px';
    } else {
      container.style.width = '400px';
      container.style.height = '600px';
      container.style.right = '24px';
      container.style.bottom = '100px';
      button.style.right = '24px';
      button.style.bottom = '24px';
    }
  }

  window.addEventListener('resize', updateMobileLayout);
  updateMobileLayout();

  // Append to body when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.appendChild(button);
      document.body.appendChild(container);
    });
  } else {
    document.body.appendChild(button);
    document.body.appendChild(container);
  }
})();
