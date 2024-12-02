# Last Closed Tab Groups

A browser extension that helps manage and restore multiple browser windows with tab groups across multiple monitors. 

## Problem
When working with multiple monitors and browser windows, closing the browser and restoring the previous session can be tedious. This extension automates the process of saving and restoring multiple window states.

## Features
- Automatically saves the state of all browser windows when closing
- Restores previous window configurations on browser startup
- Manages tab groups across multiple windows
- Provides a popup interface for:
  - Closing all windows with state preservation
  - Selecting which window groups to restore
  - Managing save/ignore preferences for specific windows

## Development
This extension is built for Chromium-based browsers (specifically tested with Brave).

## Known Issues
1. Initial homepage window appears briefly before restoration
2. Some windows may not restore properly
3. Manual exit through menu required

## Planned Improvements
- Add popup UI for closing all windows
- Window group management interface
- Preferences for window/group restoration
- Remove initial homepage window