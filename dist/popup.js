// Firefox compatibility - use browser API if available, fallback to chrome
const storageAPI = typeof browser !== 'undefined' ? browser.storage : chrome.storage;
const tabsAPI = typeof browser !== 'undefined' ? browser.tabs : chrome.tabs;

// Default settings
const DEFAULT_SETTINGS = {
  sandboxColor: '#00a1e0',
  productionColor: '#c23934',
  showOrgName: false
};

// Load saved settings
function loadSettings() {
  storageAPI.local.get(['sandboxColor', 'productionColor', 'showOrgName']).then((result) => {
    const sandboxInput = document.getElementById('sandboxColor');
    const productionInput = document.getElementById('productionColor');

    // Merge with defaults for any missing values
    const settings = {
      sandboxColor: result.sandboxColor || DEFAULT_SETTINGS.sandboxColor,
      productionColor: result.productionColor || DEFAULT_SETTINGS.productionColor,
      showOrgName: result.showOrgName !== undefined ? result.showOrgName : DEFAULT_SETTINGS.showOrgName
    };

    sandboxInput.value = settings.sandboxColor;
    productionInput.value = settings.productionColor;
    document.getElementById('showOrgName').checked = settings.showOrgName;

    // Update previews directly with the loaded settings
    updatePreview('sandboxPreview', sandboxInput, settings.sandboxColor);
    updatePreview('productionPreview', productionInput, settings.productionColor);
  }).catch((error) => {
    console.error('Error loading settings:', error);
  });
}

// Validate hex color code
function isValidHexColor(color) {
  return /^#[0-9A-F]{6}$/i.test(color);
}

// Update a single color preview
function updatePreview(previewId, inputElement, color) {
  const preview = document.getElementById(previewId);
  if (!preview) return;

  if (isValidHexColor(color)) {
    preview.style.backgroundColor = color;
    preview.style.border = `2px solid ${color}`;
    inputElement.classList.remove('invalid');
  } else {
    preview.style.backgroundColor = '#f0f0f0';
    preview.style.border = '1px solid #ddd';
    inputElement.classList.add('invalid');
  }
}

// Update color preview boxes
function updateColorPreviews() {
  const sandboxInput = document.getElementById('sandboxColor');
  const productionInput = document.getElementById('productionColor');

  updatePreview('sandboxPreview', sandboxInput, sandboxInput.value);
  updatePreview('productionPreview', productionInput, productionInput.value);
}

// Save settings and update banner
function saveSettings() {
  const sandboxColor = document.getElementById('sandboxColor').value;
  const productionColor = document.getElementById('productionColor').value;

  // Validate colors before saving - revert to defaults if invalid
  const settings = {
    sandboxColor: isValidHexColor(sandboxColor) ? sandboxColor : DEFAULT_SETTINGS.sandboxColor,
    productionColor: isValidHexColor(productionColor) ? productionColor : DEFAULT_SETTINGS.productionColor,
    showOrgName: document.getElementById('showOrgName').checked
  };

  storageAPI.local.set(settings).then(() => {
    // Send message to all Experience Cloud Builder tabs to update banner
    return tabsAPI.query({url: '*://*.builder.salesforce-experience.com/*'});
  }).then((tabs) => {
    tabs.forEach(tab => {
      tabsAPI.sendMessage(tab.id, {action: 'updateBanner', settings: settings}).catch(() => {
        // Ignore errors if content script not loaded yet
      });
    });
  }).catch((error) => {
    console.error('Error saving settings:', error);
  });
}

// Reset to defaults
function resetSettings() {
  storageAPI.local.set(DEFAULT_SETTINGS).then(() => {
    loadSettings();
    // Send message to all Experience Cloud Builder tabs to update banner
    return tabsAPI.query({url: '*://*.builder.salesforce-experience.com/*'});
  }).then((tabs) => {
    tabs.forEach(tab => {
      tabsAPI.sendMessage(tab.id, {action: 'updateBanner', settings: DEFAULT_SETTINGS}).catch(() => {
        // Ignore errors if content script not loaded yet
      });
    });
  }).catch((error) => {
    console.error('Error resetting settings:', error);
  });
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();

  // Update previews as user types
  document.getElementById('sandboxColor').addEventListener('input', updateColorPreviews);
  document.getElementById('productionColor').addEventListener('input', updateColorPreviews);

  // Save color settings on blur (after user finishes typing)
  document.getElementById('sandboxColor').addEventListener('blur', () => {
    updateColorPreviews();
    saveSettings();
  });
  document.getElementById('productionColor').addEventListener('blur', () => {
    updateColorPreviews();
    saveSettings();
  });

  // Save checkbox immediately when changed
  document.getElementById('showOrgName').addEventListener('change', saveSettings);

  // Reset button
  document.getElementById('resetButton').addEventListener('click', resetSettings);
});
