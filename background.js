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

        // Log window position BEFORE saving
        console.log(`Window Position BEFORE SAVE (Window ID: ${session.window.id}): Left: ${session.window.left}, Top: ${session.window.top}`);

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

// ... rest of the code (unchanged) ...

async function restoreLastClosedWindows(specificWindowIds = null) {
  if (isRestoringWindows) {
    console.log('Already restoring windows, skipping...');
    return;
  }

  try {
    isRestoringWindows = true;
    console.log('Starting window restoration');

    // ... (rest of the code) ...

        // Log window position AFTER restoring
        const restoredWindow = await chrome.windows.get(newWindow.id);
        console.log(`Window Position AFTER RESTORE (Window ID: ${newWindow.id}): Left: ${restoredWindow.left}, Top: ${restoredWindow.top}`);

        // ... (rest of the code) ...

  } catch (error) {
    console.error('Error in restoreLastClosedWindows:', error);
  } finally {
    isRestoringWindows = false;
  }
}

// ... rest of the code (unchanged) ...
