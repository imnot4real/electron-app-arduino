// renderer.js
const { ipcRenderer } = require('electron');

const codeTextArea = document.getElementById('code');
const portSelect = document.getElementById('port');
const connectButton = document.getElementById('connect');
const uploadButton = document.getElementById('upload');
const refreshButton = document.getElementById('refresh');
const clearButton = document.getElementById('clear');
const statusDiv = document.getElementById('status');
const connectionStatus = document.getElementById('connectionStatus');

let isConnected = false;

async function listPorts() {
    const ports = await ipcRenderer.invoke('list-ports');
    portSelect.innerHTML = '';
    ports.forEach(port => {
        const option = document.createElement('option');
        option.value = port;
        option.textContent = port;
        portSelect.appendChild(option);
    });
}

async function connectArduino() {
    const port = portSelect.value;
    if (!port) {
        showStatus('Please select a port', false);
        return;
    }

    try {
        const result = await ipcRenderer.invoke('connect-arduino', port);
        if (result.success) {
            isConnected = true;
            updateConnectionStatus(true);
            uploadButton.disabled = false;
            connectButton.textContent = 'Disconnect';
            showStatus('Connected to Arduino', true);
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        showStatus(`Connection failed: ${error.message}`, false);
        updateConnectionStatus(false);
    }
}

async function disconnectArduino() {
    try {
        const result = await ipcRenderer.invoke('disconnect-arduino');
        isConnected = false;
        updateConnectionStatus(false);
        uploadButton.disabled = true;
        connectButton.textContent = 'Connect';
        showStatus('Disconnected from Arduino', true);
    } catch (error) {
        showStatus(`Disconnect failed: ${error.message}`, false);
    }
}

async function uploadCode() {
    const code = codeTextArea.value;
    
    if (!code) {
        showStatus('Please enter some code', false);
        return;
    }

    try {
        const result = await ipcRenderer.invoke('upload-code', { 
            code,
            port: portSelect.value 
        });
        showStatus(result.message, result.success);
    } catch (error) {
        showStatus(error.message, false);
    }
}

function updateConnectionStatus(connected) {
    connectionStatus.textContent = connected ? 'Connected to Arduino' : 'Not connected to Arduino';
    connectionStatus.className = `connection-status ${connected ? 'connected' : 'disconnected'}`;
}

function showStatus(message, success) {
    statusDiv.textContent = message;
    statusDiv.className = success ? 'success' : 'error';
}

function clearCode() {
    codeTextArea.value = '';
    statusDiv.textContent = '';
    statusDiv.className = '';
}

// Event Listeners
connectButton.addEventListener('click', () => {
    if (isConnected) {
        disconnectArduino();
    } else {
        connectArduino();
    }
});
uploadButton.addEventListener('click', uploadCode);
refreshButton.addEventListener('click', listPorts);
clearButton.addEventListener('click', clearCode);

// Initial port listing
listPorts();