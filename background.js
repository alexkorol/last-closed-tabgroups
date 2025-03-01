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
  // Calculate the center point of the window
  const windowCenterX = (window.left || 0) + (window.width || 800) / 2;
  const windowCenterY = (window.top || 0) + (window.height || 600) / 2;
  
  // Find which display contains this center point
  for (const display of displays) {
    if (windowCenterX >= display.bounds.left && 
        windowCenterX < display.bounds.left + display.bounds.width &&
        windowCenterY >= display.bounds.top && 
        windowCenterY < display.bounds.top + display.bounds.height) {
      return display;
    }
  }
  
  // Sort displays by distance to window center as fallback
  const sortedDisplays = displays.map(display => ({
    display,
    distance: Math.sqrt(
      Math.pow(windowCenterX - (display.bounds.left + display.bounds.width/2), 2) +
      Math.pow(windowCenterY - (display.bounds.top + display.bounds.height/2), 2)
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
        // First try to match by display ID
        let targetDisplay = displays.find(d => d.id === session.window.displayId);
        
        // If no match by ID or displayId is missing, try matching by position
        if (!targetDisplay && session.window.left !== undefined) {
          targetDisplay = findMatchingDisplay(session.window, displays);
        }
        
        // Fall back to a display based on index if we still don't have a match
        if (!targetDisplay) {
          targetDisplay = displays[i % displays.length];
        }

        console.log(`Restoring window ${i + 1} to display:`, targetDisplay);
        
        // Use the original window position if available, otherwise center on the target display
        const windowPositionOptions = {
          focused: false,
          state: 'normal'
        };
        
        // Only apply position if we have the original coordinates
        if (session.window.left !== undefined && session.window.top !== undefined) {
          // Ensure coordinates are within the target display
          const left = Math.max(targetDisplay.bounds.left, 
                       Math.min(targetDisplay.bounds.left + targetDisplay.bounds.width - 100, 
                       session.window.left));
          const top = Math.max(targetDisplay.bounds.top, 
                      Math.min(targetDisplay.bounds.top + targetDisplay.bounds.height - 100, 
                      session.window.top));
          
          windowPositionOptions.left = left;
          windowPositionOptions.top = top;
          
          // Use original size if available
          if (session.window.width && session.window.height) {
            windowPositionOptions.width = session.window.width;
            windowPositionOptions.height = session.window.height;
          } else {
            windowPositionOptions.width = Math.min(1200, targetDisplay.bounds.width * 0.8);
            windowPositionOptions.height = Math.min(800, targetDisplay.bounds.height * 0.8);
          }
        } else {
          // Center on the target display if original coordinates aren't available
          windowPositionOptions.left = targetDisplay.bounds.left + Math.floor(targetDisplay.bounds.width * 0.1);
          windowPositionOptions.top = targetDisplay.bounds.top + Math.floor(targetDisplay.bounds.height * 0.1);
          windowPositionOptions.width = Math.floor(targetDisplay.bounds.width * 0.8);
          windowPositionOptions.height = Math.floor(targetDisplay.bounds.height * 0.8);
        }

        console.log(`Window position for restoration:`, windowPositionOptions);

        // Create new window
        const newWindow = await chrome.windows.create(windowPositionOptions);

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

        // Set the window state to match original
        const finalState = session.window.state === 'maximized' ? 'maximized' : 'normal';
        await chrome.windows.update(newWindow.id, { 
          state: finalState,
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
