// index.js (Main Process)
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const SerialPort = require('serialport');
const { PythonShell } = require('python-shell');
const fs = require('fs').promises;

let mainWindow;
let arduinoHandler = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle port listing request
ipcMain.handle('list-ports', async () => {
  try {
    const ports = await SerialPort.list();
    return ports.map(port => port.path);
  } catch (error) {
    console.error('Error listing ports:', error);
    return [];
  }
});

// Handle Arduino connection
ipcMain.handle('connect-arduino', async (event, port) => {
  try {
    // Create a new Python process for Arduino communication
    const options = {
      mode: 'text',
      pythonPath: 'python',
      pythonOptions: ['-u'],
      scriptPath: __dirname,
    };

    arduinoHandler = new PythonShell('arduino_handler.py', options);
    
    // Send connection command
    arduinoHandler.send(JSON.stringify({ command: 'connect', port: port }));
    
    return new Promise((resolve, reject) => {
      arduinoHandler.once('message', (message) => {
        const response = JSON.parse(message);
        if (response.success) {
          resolve({ success: true, message: 'Connected to Arduino' });
        } else {
          reject(new Error(response.message));
        }
      });
    });
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// Handle code upload
ipcMain.handle('upload-code', async (event, { code, port }) => {
  if (!arduinoHandler) {
    return { success: false, message: 'Arduino not connected' };
  }

  try {
    arduinoHandler.send(JSON.stringify({ command: 'execute', code: code }));
    
    return new Promise((resolve, reject) => {
      arduinoHandler.once('message', (message) => {
        const response = JSON.parse(message);
        resolve(response);
      });
    });
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// Handle disconnect
ipcMain.handle('disconnect-arduino', async () => {
  if (arduinoHandler) {
    arduinoHandler.send(JSON.stringify({ command: 'cleanup' }));
    arduinoHandler.end();
    arduinoHandler = null;
  }
  return { success: true, message: 'Disconnected from Arduino' };
});

// Cleanup on app exit
app.on('before-quit', () => {
  if (arduinoHandler) {
    arduinoHandler.send(JSON.stringify({ command: 'cleanup' }));
    arduinoHandler.end();
  }
});