const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('vpnAPI', {
    // VPN Controls
    connect: () => ipcRenderer.invoke('vpn:connect'),
    disconnect: () => ipcRenderer.invoke('vpn:disconnect'),
    getStatus: () => ipcRenderer.invoke('vpn:status'),

    // Window Controls
    minimize: () => ipcRenderer.invoke('window:minimize'),
    close: () => ipcRenderer.invoke('window:close'),

    // Events from main process
    onConnectionStatus: (callback) => {
        ipcRenderer.on('connection-status', (event, status) => callback(status));
    },
    onConnectionError: (callback) => {
        ipcRenderer.on('connection-error', (event, error) => callback(error));
    },
    onXrayLog: (callback) => {
        ipcRenderer.on('xray-log', (event, log) => callback(log));
    },

    // Remove listeners
    removeAllListeners: (channel) => {
        ipcRenderer.removeAllListeners(channel);
    },
});
