let isRestoringWindows = false;

// Listen for when windows are closed to save their state
chrome.windows.onRemoved.addListener(async (windowId) => {
  if (isRestoringWindows) {
    console.log('Ignoring window close during restoration');
    return;
  }

  const remainingWindows = await chrome.windows.getAll();
  if (remainingWindows.length > 0) {
    return; // Only save when all windows are closed
  }

  chrome.sessions.getRecentlyClosed(async (sessions) => {
    const windowSessions = sessions.filter(session => session.window);
    console.log('Found closed windows:', windowSessions);

    if (windowSessions.length > 0) {
      const displays = await getDisplayInfo();
      console.log('Available displays:', displays);

      const enhancedSessions = windowSessions.map(session => {
        if (!session.window) return session;

        // Find the matching display using displayId if available, otherwise use proximity
        const matchingDisplay = session.window.displayId 
          ? displays.find(display => display.id === session.window.displayId)
          : findMatchingDisplay(session.window, displays);

        console.log('Matched window to display:', {
          window: { left: session.window.left, top: session.window.top },
          display: matchingDisplay
        });

        return {
          ...session,
          window: {
            ...session.window,
            state: session.window.state || 'normal', // Preserve original state
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

// ... (rest of the code remains the same, except for findMatchingDisplay and getDisplayInfo)

// Improved findMatchingDisplay function
function findMatchingDisplay(window, displays) {
  console.log("Finding matching display for window:", window);
  // Prioritize displays with matching bounds (more reliable than just proximity)
  const matchingDisplays = displays.filter(display => 
    window.left >= display.bounds.left && window.left <= display.bounds.left + display.bounds.width &&
    window.top >= display.bounds.top && window.top <= display.bounds.top + display.bounds.height
  );

  if (matchingDisplays.length > 0) {
    console.log("Found exact match:", matchingDisplays[0]);
    return matchingDisplays[0];
  }

  // Fallback to proximity if no exact match is found
  const sortedDisplays = displays.map(display => ({
    display,
    distance: Math.sqrt(
      Math.pow((window.left || 0) - display.bounds.left, 2) +
      Math.pow((window.top || 0) - display.bounds.top, 2)
    )
  })).sort((a, b) => a.distance - b.distance);

  console.log("Using proximity match:", sortedDisplays[0].display);
  return sortedDisplays[0].display;
}


// Improved getDisplayInfo function with error handling
async function getDisplayInfo() {
  return new Promise((resolve, reject) => {
    if (chrome.system && chrome.system.display) {
      chrome.system.display.getInfo((displays) => {
        if (displays) {
          // Sort displays left to right
          displays.sort((a, b) => a.bounds.left - b.bounds.left);
          console.log("Displays found:", displays);
          resolve(displays);
        } else {
          reject(new Error("Failed to get display information"));
        }
      });
    } else {
      console.warn("chrome.system.display not available. Using default display.");
      resolve([{
        id: 'primary',
        bounds: { left: 0, top: 0, width: 1920, height: 1080 }
      }]);
    }
  });
}

// ... (rest of the code remains the same)
