const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('vpnAPI', {
    // VPN Controls
    connect: () => ipcRenderer.invoke('vpn:connect'),
    disconnect: () => ipcRenderer.invoke('vpn:disconnect'),
    getStatus: () => ipcRenderer.invoke('vpn:status'),
    getUsageStats: () => ipcRenderer.invoke('vpn:get-usage'),

    // Icon Generation IPC
    onGenerateIcon: (callback) => ipcRenderer.on('generate-icon', callback),
    saveIconData: (dataUrl) => ipcRenderer.invoke('save-icon-data', dataUrl),

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
    onTrafficUpdate: (callback) => {
        ipcRenderer.on('traffic-update', (event, data) => callback(data));
    },

    // Remove listeners
    removeAllListeners: (channel) => {
        ipcRenderer.removeAllListeners(channel);
    },
});
