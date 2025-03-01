document.addEventListener('DOMContentLoaded', async () => {
  const reopenButton = document.getElementById('reopen');
  const closeAllButton = document.getElementById('closeAll');
  const statusDiv = document.getElementById('status');
  const currentWindowsDiv = document.getElementById('currentWindows');
  const savedWindowsDiv = document.getElementById('savedWindows');

  // Function to create window item HTML
  function createWindowItem(window, isCurrent = false) {
    const div = document.createElement('div');
    div.className = 'window-item';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true;
    checkbox.dataset.windowId = window.id;
    
    const info = document.createElement('div');
    info.className = 'window-info';
    
    const tabCount = window.tabs ? window.tabs.length : 0;
    // Get the first non-empty title or a default
    const title = window.tabs && window.tabs.find(tab => tab.title)?.title || 'Window';
    
    info.innerHTML = `
      ${title}
      <div class="tab-count">${tabCount} tab${tabCount === 1 ? '' : 's'}</div>
    `;
    
    div.appendChild(checkbox);
    div.appendChild(info);
    return div;
  }

  // Load current windows
  async function loadCurrentWindows() {
    try {
      const windows = await chrome.windows.getAll({ populate: true });
      currentWindowsDiv.innerHTML = '';
      
      if (windows.length === 0) {
        currentWindowsDiv.innerHTML = '<div class="info">No open windows</div>';
        return;
      }

      windows.forEach(window => {
        const windowItem = createWindowItem(window, true);
        currentWindowsDiv.appendChild(windowItem);
      });
    } catch (error) {
      console.error('Error loading current windows:', error);
      currentWindowsDiv.innerHTML = '<div class="info">Error loading current windows</div>';
    }
  }

  // Load saved windows
  async function loadSavedWindows() {
    try {
      const data = await chrome.storage.local.get('lastClosedWindows');
      const windowSessions = data.lastClosedWindows || [];
      
      savedWindowsDiv.innerHTML = '';
      if (windowSessions.length === 0) {
        savedWindowsDiv.innerHTML = '<div class="info">No saved windows</div>';
        reopenButton.disabled = true;
        return;
      }

      windowSessions.forEach(session => {
        if (session.window) {
          const windowItem = createWindowItem(session.window);
          savedWindowsDiv.appendChild(windowItem);
        }
      });
      
      reopenButton.disabled = false;
    } catch (error) {
      console.error('Error loading saved windows:', error);
      savedWindowsDiv.innerHTML = '<div class="info">Error loading saved windows</div>';
      reopenButton.disabled = true;
    }
  }

  // Close all windows
  closeAllButton.addEventListener('click', async () => {
    try {
      statusDiv.textContent = 'Saving window states...';
      
      // Get all windows with their tabs
      const windows = await chrome.windows.getAll({ populate: true });
      const selectedWindowIds = Array.from(currentWindowsDiv.querySelectorAll('input[type="checkbox"]:checked'))
        .map(checkbox => parseInt(checkbox.dataset.windowId));
      
      // Get display information
      const displays = await new Promise((resolve) => {
        chrome.system.display.getInfo(resolve);
      });

      // Save selected windows state before closing
      const windowsToSave = await Promise.all(windows
        .filter(w => selectedWindowIds.includes(w.id))
        .map(async (window) => {
          // Find which display this window is primarily on
          const windowCenterX = window.left + (window.width / 2);
          const windowCenterY = window.top + (window.height / 2);
          
          const display = displays.find(d => 
            windowCenterX >= d.bounds.left && 
            windowCenterX < d.bounds.left + d.bounds.width &&
            windowCenterY >= d.bounds.top &&
            windowCenterY < d.bounds.top + d.bounds.height
          ) || displays[0];

          return {
            window: {
              ...window,
              displayId: display?.id,
              displayBounds: display?.bounds,
              state: window.state,
              left: window.left,
              top: window.top,
              width: window.width,
              height: window.height
            }
          };
        }));

      if (windowsToSave.length > 0) {
        console.log('Saving windows:', windowsToSave);
        await chrome.storage.local.set({ 
          'lastClosedWindows': windowsToSave,
          'lastSaveTimestamp': Date.now() 
        });
      }
      
      // Close all windows
      statusDiv.textContent = 'Closing windows...';
      for (const window of windows) {
        await chrome.windows.remove(window.id);
      }
      
      statusDiv.textContent = 'Windows saved successfully!';
      setTimeout(() => window.close(), 1000);
    } catch (error) {
      console.error('Error closing windows:', error);
      statusDiv.textContent = 'Error closing windows';
    }
  });

  // Restore windows
  reopenButton.addEventListener('click', async () => {
    reopenButton.disabled = true;
    statusDiv.textContent = 'Restoring windows...';

    try {
      const selectedWindows = Array.from(savedWindowsDiv.querySelectorAll('input[type="checkbox"]:checked'))
        .map(checkbox => parseInt(checkbox.dataset.windowId));
      
      await chrome.runtime.sendMessage({ 
        action: 'reopenLastClosedTabGroups',
        windowIds: selectedWindows
      });
      
      statusDiv.textContent = 'Windows restored successfully!';
      setTimeout(() => window.close(), 1000);
    } catch (error) {
      console.error('Error restoring windows:', error);
      statusDiv.textContent = 'Error restoring windows';
      reopenButton.disabled = false;
    }
  });

  // Initial load
  await loadCurrentWindows();
  await loadSavedWindows();
});
