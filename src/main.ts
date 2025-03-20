import { app, BrowserWindow, ipcMain, globalShortcut } from "electron";
import * as path from "path";
import * as fs from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import { Screenshot, Config } from "./services/types";
import { LLMServiceFactory } from "./services/llm/factory";
import { LLMService } from "./services/types";

const execFileAsync = promisify(execFile);

const CONFIG_FILE = path.join(app.getPath("userData"), "config.json");
//console.log(CONFIG_FILE);

let config: Config | null = null;
let llmService: LLMService | null = null;

let mainWindow: BrowserWindow | null = null;
let screenshotQueue: Screenshot[] = [];
let isProcessing = false;
const MAX_SCREENSHOTS = 4;
const SCREENSHOT_DIR = path.join(app.getPath("temp"), "screenshots");

async function ensureScreenshotDir() {
  try {
    await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
  } catch (error) {
    console.error("Error creating screenshot directory:", error);
  }
}

async function loadConfig(): Promise<Config | null> {
  try {
    // Check if config file exists before trying to read it
    try {
      await fs.access(CONFIG_FILE);
    } catch (err) {
      // Config file doesn't exist yet, which is fine for first run
      console.log("Config file not found. Will create on first save.");
      return null;
    }

    // If config file exists, load it
    const data = await fs.readFile(CONFIG_FILE, "utf-8");
    const loadedConfig = JSON.parse(data);
    if (loadedConfig && loadedConfig.provider && loadedConfig.language) {
      await initializeLLMService(loadedConfig);
      return loadedConfig;
    }
    return null;
  } catch (error) {
    console.error("Error loading config:", error);
    return null;
  }
}

async function ensureConfigDir() {
  try {
    const configDir = path.dirname(CONFIG_FILE);
    await fs.mkdir(configDir, { recursive: true });
  } catch (error) {
    console.error("Error creating config directory:", error);
  }
}

async function initializeLLMService(config: Config): Promise<void> {
  try {
    // Allow the app to run without a config initially
    if (!config) {
      console.log(
        "No config available. LLM service will be initialized after configuration."
      );
      return;
    }

    llmService = await LLMServiceFactory.createService({
      provider: config.provider,
      apiKey: config.apiKey,
      language: config.language,
      modelName: config.modelName,
      endpoint: config.endpoint,
    });
  } catch (error) {
    console.error("Failed to initialize LLM service:", error);
    // Don't throw here, just log the error and let the app continue
    // The user can configure the service through the UI
  }
}

async function saveConfig(newConfig: Config): Promise<void> {
  try {
    if (!newConfig.provider || !newConfig.language) {
      throw new Error("Invalid configuration");
    }

    // Ensure the config directory exists
    await ensureConfigDir();

    await fs.writeFile(CONFIG_FILE, JSON.stringify(newConfig, null, 2));
    config = newConfig;

    // Initialize LLM service with new config
    await initializeLLMService(newConfig);
  } catch (error) {
    console.error("Error saving config:", error);
    throw error;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    hasShadow: false,
    alwaysOnTop: true,
    titleBarStyle: "hidden",
    skipTaskbar: true,
    type: "toolbar", // Most capture software ignores toolbar windows
    opacity: 0.99, // Slightly less than 100% opacity can trick some capture software
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Enable content protection to prevent screen capture
  mainWindow.setContentProtection(true);

  // Platform specific enhancements for macOS
  if (process.platform === "darwin") {
    app.dock.hide(); // Hide from dock which helps avoid capture
    mainWindow.setHiddenInMissionControl(true);
    mainWindow.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true,
    });
    mainWindow.setAlwaysOnTop(true, "screen-saver"); // Use screen-saver level (highest)

    // Set additional macOS specific window traits
    try {
      const bounds = mainWindow.getBounds();
      mainWindow.setBounds({
        ...bounds,
        height: bounds.height + 1, // Force window manager to reconsider window
      });
      setTimeout(() => {
        mainWindow?.setBounds(bounds); // Restore original bounds
      }, 100);
    } catch (err) {
      console.error("Error setting window properties:", err);
    }
  }

  // For Windows systems
  if (process.platform === "win32") {
    // Set Windows-specific window styles for more capture invisibility
    const { BrowserWindow } = require("electron");
    const win32Window = mainWindow.getNativeWindowHandle();
    const user32 = new (require("ffi-napi").Library)("user32", {
      SetWindowLongA: ["long", ["long", "int", "long"]],
      GetWindowLongA: ["long", ["long", "int"]],
    });

    const GWL_EXSTYLE = -20;
    const WS_EX_TOOLWINDOW = 0x00000080;
    const WS_EX_LAYERED = 0x00080000;

    try {
      const exStyle = user32.GetWindowLongA(win32Window, GWL_EXSTYLE);
      user32.SetWindowLongA(
        win32Window,
        GWL_EXSTYLE,
        exStyle | WS_EX_TOOLWINDOW | WS_EX_LAYERED
      );
    } catch (err) {
      console.error("Error setting Windows window style:", err);
    }
  }

  // Load the index.html file from the dist directory
  mainWindow.loadFile(path.join(__dirname, "../dist/renderer/index.html"));

  // Register global shortcuts
  registerShortcuts();
}

function registerShortcuts() {
  // Screenshot & Processing shortcuts
  globalShortcut.register("CommandOrControl+H", handleTakeScreenshot);
  globalShortcut.register("CommandOrControl+Enter", handleProcessScreenshots);
  globalShortcut.register("CommandOrControl+R", handleResetQueue);
  globalShortcut.register("CommandOrControl+Q", () => app.quit());

  // Window visibility
  globalShortcut.register("CommandOrControl+B", handleToggleVisibility);

  // Window movement
  globalShortcut.register("CommandOrControl+Left", () => moveWindow("left"));
  globalShortcut.register("CommandOrControl+Right", () => moveWindow("right"));
  globalShortcut.register("CommandOrControl+Up", () => moveWindow("up"));
  globalShortcut.register("CommandOrControl+Down", () => moveWindow("down"));

  // Config shortcut
  globalShortcut.register("CommandOrControl+P", () => {
    mainWindow?.webContents.send("show-config");
  });
}

async function captureScreenshot(): Promise<Buffer> {
  if (process.platform === "darwin") {
    const tmpPath = path.join(SCREENSHOT_DIR, `${Date.now()}.png`);
    await execFileAsync("screencapture", ["-x", tmpPath]);
    const buffer = await fs.readFile(tmpPath);
    await fs.unlink(tmpPath);
    return buffer;
  } else {
    // Windows implementation
    const tmpPath = path.join(SCREENSHOT_DIR, `${Date.now()}.png`);
    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      Add-Type -AssemblyName System.Drawing
      $screen = [System.Windows.Forms.Screen]::PrimaryScreen
      $bitmap = New-Object System.Drawing.Bitmap $screen.Bounds.Width, $screen.Bounds.Height
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      $graphics.CopyFromScreen($screen.Bounds.X, $screen.Bounds.Y, 0, 0, $bitmap.Size)
      $bitmap.Save('${tmpPath.replace(/\\/g, "\\\\")}')
      $graphics.Dispose()
      $bitmap.Dispose()
    `;
    await execFileAsync("powershell", ["-command", script]);
    const buffer = await fs.readFile(tmpPath);
    await fs.unlink(tmpPath);
    return buffer;
  }
}

async function handleTakeScreenshot() {
  if (screenshotQueue.length >= MAX_SCREENSHOTS) return;

  try {
    // Hide window before taking screenshot
    mainWindow?.hide();
    await new Promise((resolve) => setTimeout(resolve, 100));

    const buffer = await captureScreenshot();
    const id = Date.now();
    const screenshotPath = path.join(SCREENSHOT_DIR, `${id}.png`);

    await fs.writeFile(screenshotPath, buffer);
    const preview = `data:image/png;base64,${buffer.toString("base64")}`;

    const screenshot = { id, preview, path: screenshotPath };
    screenshotQueue.push(screenshot);

    mainWindow?.show();
    mainWindow?.webContents.send("screenshot-taken", screenshot);
  } catch (error) {
    console.error("Error taking screenshot:", error);
    mainWindow?.show();
  }
}

async function handleProcessScreenshots() {
  if (isProcessing || screenshotQueue.length === 0) return;

  isProcessing = true;
  mainWindow?.webContents.send("processing-started");

  try {
    if (!llmService) {
      throw new Error(
        "LLM service not initialized. Please configure your API settings first. Click CTRL/CMD + P to open settings."
      );
    }

    const result = await llmService.processScreenshots(screenshotQueue);
    // Check if processing was cancelled
    if (!isProcessing) return;
    mainWindow?.webContents.send("processing-complete", JSON.stringify(result));
  } catch (error: any) {
    console.error("Error processing screenshots:", error);
    // Check if processing was cancelled
    if (!isProcessing) return;

    // Extract the most relevant error message
    let errorMessage = "Error processing screenshots";
    if (error?.error?.message) {
      errorMessage = error.error.message;
    } else if (error?.message) {
      errorMessage = error.message;
    }

    mainWindow?.webContents.send(
      "processing-complete",
      JSON.stringify({
        error: errorMessage,
        approach: "Error occurred while processing",
        code: "Error: " + errorMessage,
        timeComplexity: "N/A",
        spaceComplexity: "N/A",
      })
    );
  } finally {
    isProcessing = false;
  }
}

async function handleResetQueue() {
  // Cancel any ongoing processing
  if (isProcessing) {
    isProcessing = false;
    mainWindow?.webContents.send(
      "processing-complete",
      JSON.stringify({
        approach: "Processing cancelled",
        code: "",
        timeComplexity: "",
        spaceComplexity: "",
      })
    );
  }

  // Delete all screenshot files
  for (const screenshot of screenshotQueue) {
    try {
      await fs.unlink(screenshot.path);
    } catch (error) {
      console.error("Error deleting screenshot:", error);
    }
  }

  screenshotQueue = [];
  mainWindow?.webContents.send("queue-reset");
}

function handleToggleVisibility() {
  if (!mainWindow) return;
  if (mainWindow.isVisible()) {
    // When hiding, make sure we remove all screen-capture related traces
    mainWindow.hide();
    if (process.platform === "darwin") {
      try {
        // Use proper Electron API instead of direct setWindowLevel
        mainWindow.setAlwaysOnTop(false);
        setTimeout(() => {
          if (mainWindow && !mainWindow.isVisible()) {
            mainWindow.setAlwaysOnTop(true, "screen-saver"); // Highest z-order
          }
        }, 100);
      } catch (err) {
        console.error("Error manipulating window level:", err);
      }
    }
  } else {
    mainWindow.show();
    if (process.platform === "darwin") {
      try {
        mainWindow.setAlwaysOnTop(true, "screen-saver"); // Highest z-order
      } catch (err) {
        console.error("Error setting window level:", err);
      }
    }
  }
}

function moveWindow(direction: "left" | "right" | "up" | "down") {
  if (!mainWindow) return;

  const [x, y] = mainWindow.getPosition();
  const moveAmount = 50;

  switch (direction) {
    case "left":
      mainWindow.setPosition(x - moveAmount, y);
      break;
    case "right":
      mainWindow.setPosition(x + moveAmount, y);
      break;
    case "up":
      mainWindow.setPosition(x, y - moveAmount);
      break;
    case "down":
      mainWindow.setPosition(x, y + moveAmount);
      break;
  }
}

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  await ensureScreenshotDir();
  await ensureConfigDir();
  // Load config before creating window
  config = await loadConfig();
  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  handleResetQueue();
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});

// IPC Handlers
ipcMain.handle("take-screenshot", handleTakeScreenshot);
ipcMain.handle("process-screenshots", handleProcessScreenshots);
ipcMain.handle("reset-queue", handleResetQueue);

// Window control events
ipcMain.on("minimize-window", () => {
  mainWindow?.minimize();
});

ipcMain.on("maximize-window", () => {
  if (mainWindow?.isMaximized()) {
    mainWindow?.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on("close-window", () => {
  mainWindow?.close();
});

ipcMain.on("quit-app", () => {
  app.quit();
});

ipcMain.on("toggle-visibility", handleToggleVisibility);

// Add these IPC handlers before app.whenReady()
ipcMain.handle("get-config", async () => {
  try {
    if (!config) {
      config = await loadConfig();
    }
    return config;
  } catch (error) {
    console.error("Error getting config:", error);
    return null;
  }
});

ipcMain.handle("save-config", async (_, newConfig: Config) => {
  try {
    await saveConfig(newConfig);
    return true;
  } catch (error) {
    console.error("Error in save-config handler:", error);
    return false;
  }
});
