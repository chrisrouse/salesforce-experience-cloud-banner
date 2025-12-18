(function() {
  'use strict';

  // Firefox compatibility - use browser API if available, fallback to chrome
  const storageAPI = typeof browser !== 'undefined' ? browser.storage : chrome.storage;

  // Default settings
  const DEFAULT_SETTINGS = {
    sandboxColor: '#00a1e0',
    productionColor: '#c23934',
    showOrgName: false
  };

  function detectEnvironment() {
    const hostname = window.location.hostname;

    if (hostname.includes('.sandbox.')) {
      return {
        type: 'sandbox',
        name: hostname.split('.')[0].replace(/--/g, ' - '),
        className: 'sf-env-banner-sandbox'
      };
    } else if (hostname.includes('.builder.salesforce-experience.com')) {
      return {
        type: 'production',
        name: hostname.split('.')[0].replace(/--/g, ' - '),
        className: 'sf-env-banner-production'
      };
    }

    return null;
  }

  function createBanner(environment, settings) {
    const banner = document.createElement('div');
    banner.id = 'sf-environment-banner';
    banner.className = `sf-env-banner ${environment.className}`;

    const content = document.createElement('div');
    content.className = 'sf-env-banner-content';

    const text = document.createElement('span');
    text.className = 'sf-env-banner-text';

    // Use settings to determine banner text
    if (settings.showOrgName) {
      text.textContent = environment.type === 'production'
        ? `${environment.name.toUpperCase()} - PRODUCTION`
        : `${environment.name.toUpperCase()} SANDBOX`;
    } else {
      text.textContent = environment.type === 'production'
        ? 'PRODUCTION'
        : 'SANDBOX';
    }

    // Apply custom colors
    const bgColor = environment.type === 'production'
      ? settings.productionColor
      : settings.sandboxColor;
    banner.style.backgroundColor = bgColor;

    content.appendChild(text);
    banner.appendChild(content);

    return banner;
  }

  function insertBanner(settings) {
    const environment = detectEnvironment();

    if (!environment) {
      return;
    }

    const targetElement = document.querySelector('[data-id="above-appdev-bar"]');

    if (targetElement && !document.getElementById('sf-environment-banner')) {
      const banner = createBanner(environment, settings);
      targetElement.parentNode.insertBefore(banner, targetElement);
    }
  }

  function init() {
    // Load settings from storage
    storageAPI.local.get(['sandboxColor', 'productionColor', 'showOrgName']).then((result) => {
      // Merge with defaults for any missing values
      const settings = {
        sandboxColor: result.sandboxColor || DEFAULT_SETTINGS.sandboxColor,
        productionColor: result.productionColor || DEFAULT_SETTINGS.productionColor,
        showOrgName: result.showOrgName !== undefined ? result.showOrgName : DEFAULT_SETTINGS.showOrgName
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          insertBanner(settings);
          observeForTargetElement(settings);
        });
      } else {
        insertBanner(settings);
        observeForTargetElement(settings);
      }
    }).catch((error) => {
      console.error('[SF Environment Banner] Error loading settings:', error);
    });
  }

  function observeForTargetElement(settings) {
    if (document.getElementById('sf-environment-banner')) {
      return;
    }

    const observer = new MutationObserver((mutations) => {
      const targetElement = document.querySelector('[data-id="above-appdev-bar"]');
      if (targetElement && !document.getElementById('sf-environment-banner')) {
        insertBanner(settings);
        observer.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => observer.disconnect(), 10000);
  }

  // Listen for messages from popup to update banner without reload
  const runtimeAPI = typeof browser !== 'undefined' ? browser.runtime : chrome.runtime;

  runtimeAPI.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateBanner') {
      const existingBanner = document.getElementById('sf-environment-banner');
      if (existingBanner) {
        existingBanner.remove();
      }
      insertBanner(message.settings);
    }
  });

  init();
})();
