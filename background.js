let isRestoringWindows = false;

// Listen for when windows are closed to save their state
chrome.windows.onRemoved.addListener(async (windowId) => {
  if (isRestoringWindows) {
    console.log('Ignoring window close during restoration');
    return;
  }

  // Get all current windows to check if this is the last one closing
  const remainingWindows = await chrome.windows.getAll();
  if (remainingWindows.length > 0) {
    return; // Only save when all windows are closed
  }

  // Get all windows from recent history
  chrome.sessions.getRecentlyClosed(async (sessions) => {
    const windowSessions = sessions.filter(session => session.window);
    console.log('Found closed windows:', windowSessions);

    if (windowSessions.length > 0) {
      // Get display info for each window
      const displays = await getDisplayInfo();
      console.log('Available displays:', displays);
      
      // Enhance window sessions with display information
      const enhancedSessions = windowSessions.map(session => {
        if (!session.window) return session;

        // Find the matching display based on window position
        const matchingDisplay = findMatchingDisplay(session.window, displays);
        console.log('Matched window to display:', {
          window: {
            left: session.window.left,
            top: session.window.top
          },
          display: matchingDisplay
        });

        return {
          ...session,
          window: {
            ...session.window,
            state: 'maximized',
            displayId: matchingDisplay.id,
            displayBounds: matchingDisplay.bounds
          }
        };
      });

      console.log('Saving window sessions:', enhancedSessions);
      await chrome.storage.local.set({ 
        'lastClosedWindows': enhancedSessions,
        'lastSaveTimestamp': Date.now()
      });
    }
  });
});

// Listen for messages to reopen windows
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'reopenLastClosedTabGroups') {
    restoreLastClosedWindows(request.windowIds);
  }
});

// Helper function to find matching display for a window
function findMatchingDisplay(window, displays) {
  // Sort displays by distance to window position
  const sortedDisplays = displays.map(display => ({
    display,
    distance: Math.sqrt(
      Math.pow((window.left || 0) - display.bounds.left, 2) +
      Math.pow((window.top || 0) - display.bounds.top, 2)
    )
  })).sort((a, b) => a.distance - b.distance);

  return sortedDisplays[0].display;
}

async function restoreLastClosedWindows(specificWindowIds = null) {
  if (isRestoringWindows) {
    console.log('Already restoring windows, skipping...');
    return;
  }

  try {
    isRestoringWindows = true;
    console.log('Starting window restoration');

    // Get saved windows
    const data = await chrome.storage.local.get(['lastClosedWindows', 'lastSaveTimestamp']);
    let windowSessions = data.lastClosedWindows || [];
    
    if (windowSessions.length === 0) {
      console.log('No closed windows found to restore');
      return;
    }

    // Get display info
    const displays = await getDisplayInfo();
    console.log('Available displays:', displays);

    // Get initial windows to close later
    const initialWindows = await chrome.windows.getAll();
    
    // Filter windows if specific IDs were provided
    if (specificWindowIds) {
      windowSessions = windowSessions.filter(session => 
        specificWindowIds.includes(session.window.id)
      );
    }

    console.log(`Attempting to restore ${windowSessions.length} windows`);

    // Sort windows by display position (left to right)
    windowSessions.sort((a, b) => {
      return (a.window.displayBounds?.left || 0) - (b.window.displayBounds?.left || 0);
    });

    // Restore each window
    for (let i = 0; i < windowSessions.length; i++) {
      const session = windowSessions[i];
      if (!session.window?.tabs?.length) continue;

      try {
        // Find the matching display based on saved displayId
        let targetDisplay = displays.find(d => d.id === session.window.displayId) || 
                          displays[i % displays.length];

        console.log(`Restoring window ${i + 1} to display:`, targetDisplay);

        // Create new window
        const newWindow = await chrome.windows.create({
          focused: false,
          state: 'normal',
          left: targetDisplay.bounds.left,
          top: targetDisplay.bounds.top,
          width: targetDisplay.bounds.width,
          height: targetDisplay.bounds.height
        });

        // Create all tabs in this window
        const tabs = session.window.tabs;
        console.log(`Creating ${tabs.length} tabs for window ${i + 1}`);

        for (const tab of tabs) {
          await chrome.tabs.create({
            windowId: newWindow.id,
            url: tab.url,
            pinned: tab.pinned,
            active: tab.active
          });
        }

        // Remove the initial blank tab
        const initialTabs = await chrome.tabs.query({ windowId: newWindow.id });
        if (initialTabs.length > tabs.length) {
          await chrome.tabs.remove(initialTabs[0].id);
        }

        // Maximize the window
        await chrome.windows.update(newWindow.id, { 
          state: 'maximized',
          focused: i === windowSessions.length - 1 // Focus last window
        });

        console.log(`Successfully restored window ${i + 1}`);

      } catch (error) {
        console.error(`Error restoring window ${i + 1}:`, error);
      }
    }

    // Close initial windows after successful restoration
    console.log('Closing initial windows');
    for (const window of initialWindows) {
      try {
        await chrome.windows.remove(window.id);
      } catch (error) {
        console.error('Error closing initial window:', error);
      }
    }

    // Clear the stored windows
    await chrome.storage.local.remove(['lastClosedWindows', 'lastSaveTimestamp']);

  } catch (error) {
    console.error('Error in restoreLastClosedWindows:', error);
  } finally {
    isRestoringWindows = false;
  }
}

// Function to get display information
async function getDisplayInfo() {
  return new Promise((resolve) => {
    if (chrome.system && chrome.system.display) {
      chrome.system.display.getInfo((displays) => {
        // Sort displays left to right
        displays.sort((a, b) => a.bounds.left - b.bounds.left);
        resolve(displays);
      });
    } else {
      resolve([{
        id: 'primary',
        bounds: { left: 0, top: 0, width: 1920, height: 1080 }
      }]);
    }
  });
}

// Handle browser startup
chrome.runtime.onStartup.addListener(() => {
  console.log('Browser starting up, will restore windows');
  setTimeout(async () => {
    await restoreLastClosedWindows();
  }, 500);
});

// Handle extension installation/update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install' || details.reason === 'update') {
    chrome.storage.local.remove(['lastClosedWindows', 'lastSaveTimestamp']);
  }
});
