const { globalShortcut } = require("electron");

class HotkeyManager {
  constructor() {
    this.currentHotkey = "`";
    this.isInitialized = false;
  }

  setupShortcuts(hotkey = "`", callback) {
    if (!callback) {
      throw new Error("Callback function is required for hotkey setup");
    }

    // Unregister previous hotkey if it exists
    if (this.currentHotkey && this.currentHotkey !== "GLOBE") {
      try {
        globalShortcut.unregister(this.currentHotkey);
      } catch (err) {
        console.warn(`Warning unregistering previous hotkey ${this.currentHotkey}:`, err.message);
      }
    }

    try {
      if (hotkey === "GLOBE") {
        if (process.platform !== "darwin") {
          return {
            success: false,
            error: "The Globe key is only available on macOS.",
          };
        }
        this.currentHotkey = hotkey;
        return { success: true, hotkey };
      }

      // First attempt: Try to register directly
      let success = globalShortcut.register(hotkey, callback);

      // SAFETY NET: If registration failed, force-clear all shortcuts and retry
      if (!success) {
        console.warn(`⚠️  Hotkey registration failed for "${hotkey}", clearing all shortcuts and retrying...`);
        try {
          globalShortcut.unregisterAll();
          success = globalShortcut.register(hotkey, callback);
        } catch (retryErr) {
          console.error("Failed to register hotkey after retry:", retryErr);
          return {
            success: false,
            error: `Failed to register hotkey after retry: ${retryErr.message}`,
          };
        }
      }

      if (success) {
        this.currentHotkey = hotkey;
        console.log(`✅ Hotkey registered: ${hotkey}`);
        return { success: true, hotkey };
      } else {
        console.error(`Failed to register hotkey: ${hotkey}`);
        return {
          success: false,
          error: `Failed to register hotkey: ${hotkey}`,
        };
      }
    } catch (error) {
      console.error("Error setting up shortcuts:", error);
      return { success: false, error: error.message };
    }
  }

  async initializeHotkey(mainWindow, callback) {
    if (!mainWindow || !callback) {
      throw new Error("mainWindow and callback are required");
    }

    // Set up default hotkey first
    this.setupShortcuts("`", callback);

    // Listen for window to be ready, then get saved hotkey
    mainWindow.webContents.once("did-finish-load", () => {
      setTimeout(() => {
        this.loadSavedHotkey(mainWindow, callback);
      }, 1000);
    });

    this.isInitialized = true;
  }

  async loadSavedHotkey(mainWindow, callback) {
    try {
      const savedHotkey = await mainWindow.webContents.executeJavaScript(`
        localStorage.getItem("dictationKey") || "\`"
      `);

      if (savedHotkey && savedHotkey !== "`") {
        const result = this.setupShortcuts(savedHotkey, callback);
        if (result.success) {
          // Hotkey initialized from localStorage
        }
      }
    } catch (err) {
      console.error("Failed to get saved hotkey:", err);
    }
  }

  async updateHotkey(hotkey, callback) {
    if (!callback) {
      throw new Error("Callback function is required for hotkey update");
    }

    try {
      const result = this.setupShortcuts(hotkey, callback);
      if (result.success) {
        return { success: true, message: `Hotkey updated to: ${hotkey}` };
      } else {
        return { success: false, message: result.error };
      }
    } catch (error) {
      console.error("Failed to update hotkey:", error);
      return {
        success: false,
        message: `Failed to update hotkey: ${error.message}`,
      };
    }
  }

  getCurrentHotkey() {
    return this.currentHotkey;
  }

  unregisterAll() {
    try {
      globalShortcut.unregisterAll();
    } catch (err) {
      console.warn("Warning while unregistering hotkeys:", err.message);
    }
  }

  isHotkeyRegistered(hotkey) {
    try {
      return globalShortcut.isRegistered(hotkey);
    } catch (err) {
      console.error("Error checking hotkey registration:", err.message);
      return false;
    }
  }
}

module.exports = HotkeyManager;
