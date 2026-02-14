// MTE VPN - Renderer Application Logic

class VPNApp {
    constructor() {
        this.isConnected = false;
        this.isConnecting = false;
        this.connectionStartTime = null;
        this.timerInterval = null;

        this.initElements();
        this.initEventListeners();
        this.initIPCListeners();
        this.checkInitialStatus();
    }

    initElements() {
        this.connectBtn = document.getElementById('connect-btn');
        this.statusText = document.getElementById('status-text');
        this.statusDot = document.getElementById('status-dot');
        this.connectionTime = document.getElementById('connection-time');
        this.timeDisplay = document.getElementById('time-display');
        this.errorContainer = document.getElementById('error-container');
        this.errorText = document.getElementById('error-text');
        this.btnMinimize = document.getElementById('btn-minimize');
        this.btnClose = document.getElementById('btn-close');
        this.connectLabel = document.getElementById('connect-label');

        // New stats elements
        this.statsGrid = document.getElementById('stats-grid');
        this.downloadSpeed = document.getElementById('download-speed');
        this.uploadSpeed = document.getElementById('upload-speed');
        this.totalUsage = document.getElementById('total-usage');
    }

    initEventListeners() {
        // Connect/Disconnect button
        this.connectBtn.addEventListener('click', () => this.toggleConnection());

        // Window controls
        this.btnMinimize.addEventListener('click', () => {
            console.log('Minimize button clicked');
            window.vpnAPI.minimize();
        });

        this.btnClose.addEventListener('click', () => {
            console.log('Close button clicked');
            window.vpnAPI.close();
        });
    }

    initIPCListeners() {
        // Listen for connection status changes from main process
        window.vpnAPI.onConnectionStatus((status) => {
            switch (status) {
                case 'connected':
                    this.setConnectedState();
                    break;
                case 'disconnected':
                    this.setDisconnectedState();
                    break;
                case 'connecting':
                    this.setConnectingState();
                    break;
            }
        });

        // Listen for traffic updates
        window.vpnAPI.onTrafficUpdate((data) => {
            this.updateTrafficUI(data);
        });

        // Listen for errors
        window.vpnAPI.onConnectionError((error) => {
            this.showError(error);
        });

        // Listen for Xray logs
        window.vpnAPI.onXrayLog((log) => {
            console.log('[Xray]', log);
        });
    }

    updateTrafficUI(data) {
        if (!this.isConnected) return;

        this.downloadSpeed.textContent = this.formatSpeed(data.downSpeed);
        this.uploadSpeed.textContent = this.formatSpeed(data.upSpeed);
        this.totalUsage.textContent = this.formatData(data.total);
    }

    formatSpeed(bytes) {
        if (!bytes || isNaN(bytes) || bytes === 0) return '0.00 KB/s';
        const kb = bytes / 1024;
        if (kb < 1024) return `${kb.toFixed(2)} KB/s`;
        const mb = kb / 1024;
        return `${mb.toFixed(2)} MB/s`;
    }

    formatData(bytes) {
        if (!bytes || isNaN(bytes) || bytes === 0) return '0.00 MB';
        const mb = bytes / (1024 * 1024);
        if (mb < 1024) return `${mb.toFixed(2)} MB`;
        const gb = mb / 1024;
        return `${gb.toFixed(2)} GB`;
    }

    async checkInitialStatus() {
        try {
            const status = await window.vpnAPI.getStatus();
            if (status.connected) {
                this.setConnectedState();
            }
        } catch (error) {
            console.error('Status check failed:', error);
        }
    }

    async toggleConnection() {
        if (this.isConnecting) return;

        this.hideError();

        if (this.isConnected) {
            await this.disconnect();
        } else {
            await this.connect();
        }
    }

    async connect() {
        this.setConnectingState();

        try {
            const result = await window.vpnAPI.connect();
            if (result.success) {
                this.setConnectedState();
            } else {
                this.setDisconnectedState();
                this.showError(result.error || 'Bağlantı kurulamadı');
            }
        } catch (error) {
            this.setDisconnectedState();
            this.showError(error.message || 'Bağlantı hatası');
        }
    }

    async disconnect() {
        try {
            const result = await window.vpnAPI.disconnect();
            if (result.success) {
                this.setDisconnectedState();
            }
        } catch (error) {
            console.error('Disconnect error:', error);
            this.setDisconnectedState();
        }
    }

    setConnectingState() {
        this.isConnecting = true;
        this.isConnected = false;

        document.body.className = 'connecting';
        this.statusText.textContent = 'Bağlanıyor...';
        this.connectLabel.textContent = 'Bağlantı kuruluyor';
        this.connectionTime.style.display = 'none';
        this.statsGrid.style.display = 'none';
    }

    setConnectedState() {
        this.isConnected = true;
        this.isConnecting = false;
        this.connectionStartTime = Date.now();

        document.body.className = 'connected';
        this.statusText.textContent = 'Bağlandı';
        this.connectLabel.textContent = 'Bağlantıyı kesmek için dokunun';
        this.connectionTime.style.display = 'flex';
        this.statsGrid.style.display = 'grid';

        this.startTimer();
        this.hideError();
    }

    setDisconnectedState() {
        this.isConnected = false;
        this.isConnecting = false;
        this.connectionStartTime = null;

        document.body.className = '';
        this.statusText.textContent = 'Bağlantı Kesildi';
        this.connectLabel.textContent = 'Bağlanmak için dokunun';
        this.connectionTime.style.display = 'none';
        this.statsGrid.style.display = 'none';

        this.stopTimer();
    }

    startTimer() {
        this.stopTimer();
        this.timerInterval = setInterval(() => {
            if (!this.connectionStartTime) return;

            const elapsed = Math.floor((Date.now() - this.connectionStartTime) / 1000);
            const hours = Math.floor(elapsed / 3600).toString().padStart(2, '0');
            const minutes = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
            const seconds = (elapsed % 60).toString().padStart(2, '0');

            this.timeDisplay.textContent = `${hours}:${minutes}:${seconds}`;
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        this.timeDisplay.textContent = '00:00:00';
    }

    showError(message) {
        this.errorText.textContent = message;
        this.errorContainer.style.display = 'block';

        // Auto-hide after 8 seconds
        setTimeout(() => this.hideError(), 8000);
    }

    hideError() {
        this.errorContainer.style.display = 'none';
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    new VPNApp();
});
