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

## Setting up your PATH environment variable

The PATH environment variable tells your operating system where to look for executable files (like `python.exe`, `cmd.exe`, and `powershell.exe`). If you're having trouble running commands, it's likely that your PATH isn't configured correctly.  Here's how to add directories to your PATH on different operating systems:

**Windows:**

1. **Search for "environment variables":**  Type "environment variables" in the Windows search bar and select "Edit the system environment variables".
2. **Click "Environment Variables...":** This opens a dialog box with two sections: "User variables" and "System variables".  Changes to "System variables" affect all users on the computer.
3. **Find or create the PATH variable:** In the "System variables" section, locate the variable named "Path" (or "PATH"). If it doesn't exist, click "New..." to create it.
4. **Edit the PATH variable:** Select the "Path" variable and click "Edit...".
5. **Add new entries:** Click "New" and add the full path to the directory containing `python.exe`, `cmd.exe`, and `powershell.exe`.  For example:  `C:\Python39`, `C:\Windows\System32`.  Repeat for each directory you want to add.
6. **Save changes:** Click "OK" on all open dialog boxes to save your changes.  You may need to restart your computer or terminal for the changes to take effect.

**macOS:**

1. **Open the Terminal application.**
2. **Open your `.bash_profile` or `.zshrc` file:** Use the command `open ~/.bash_profile` (or `open ~/.zshrc` if you use Zsh). If the file doesn't exist, create it.
3. **Add the paths:** Add lines like these to the file, replacing `/path/to/your/directory` with the actual paths:
   ```bash
   export PATH="/path/to/your/python/directory:$PATH"
   export PATH="/path/to/your/other/directory:$PATH"
   ```
4. **Save the file.**
5. **Source the file:** In the Terminal, run `source ~/.bash_profile` (or `source ~/.zshrc`).

**Linux (instructions may vary slightly depending on your distribution):**

1. **Open a terminal.**
2. **Edit your shell configuration file:** This is usually `.bashrc`, `.bash_profile`, or `.zshrc`, depending on your shell.  Use a text editor like `nano` or `vim` to open the file (e.g., `nano ~/.bashrc`).
3. **Add the paths:** Add lines similar to the macOS instructions, replacing `/path/to/your/directory` with the correct paths:
   ```bash
   export PATH="/path/to/your/python/directory:$PATH"
   export PATH="/path/to/your/other/directory:$PATH"
   ```
4. **Save the file.**
5. **Source the file:** Run `source ~/.bashrc` (or the appropriate file name).


**Important:**  Replace `/path/to/your/directory` with the actual paths to your Python installation, `cmd.exe`, and `powershell.exe` directories.  After making changes to your PATH, you may need to restart your terminal or computer for the changes to take effect.  If you are still having problems, please provide the requested information so I can give you more specific guidance.
