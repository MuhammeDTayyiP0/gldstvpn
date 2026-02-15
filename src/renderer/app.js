// V204 VPN - Tauri Renderer Logic v4.1 (v3.0.0)
const invoke = window.__TAURI__.invoke;
const { appWindow } = window.__TAURI__.window;
const { listen } = window.__TAURI__.event;

class VPNApp {
    constructor() {
        this.isConnected = false;
        this.isConnecting = false;
        this.connectionStartTime = null;
        this.timerInterval = null;
        this.ambientParticleInterval = null;
        this.lastStats = { up: 0, down: 0, timestamp: Date.now() };

        this.initPlatform();
        this.initElements();
        this.initSettingsInfo();
        this.initEventListeners();
        this.initTauriListeners();
    }

    initPlatform() {
        // Detect platform to apply optimizations (especially for Linux)
        const platform = window.navigator.platform.toLowerCase();
        if (platform.includes('linux')) {
            document.body.classList.add('platform-linux');
        } else if (platform.includes('win')) {
            document.body.classList.add('platform-windows');
        } else if (platform.includes('mac')) {
            document.body.classList.add('platform-macos');
        }
    }

    initElements() {
        this.connectBtn = document.getElementById('connect-btn');
        this.connectBtnWrapper = document.getElementById('connect-btn-wrapper');
        this.statusText = document.getElementById('status-text');
        this.statusDot = document.getElementById('status-dot');
        this.connectionTime = document.getElementById('connection-time');
        this.timeDisplay = document.getElementById('time-display');
        this.errorContainer = document.getElementById('error-container');
        this.errorText = document.getElementById('error-text');
        this.btnMinimize = document.getElementById('btn-minimize');
        this.btnClose = document.getElementById('btn-close');
        this.connectLabel = document.getElementById('connect-label');
        this.rippleContainer = document.getElementById('ripple-container');
        this.shockwave = document.getElementById('shockwave');
        this.successBurst = document.getElementById('success-burst');
        this.disconnectBurst = document.getElementById('disconnect-burst');
        this.particlesContainer = document.getElementById('particles-container');
        this.screenFlash = document.getElementById('screen-flash');

        // Stats elements
        this.statsGrid = document.getElementById('stats-grid');
        this.downloadSpeed = document.getElementById('download-speed');
        this.uploadSpeed = document.getElementById('upload-speed');
        this.totalUsage = document.getElementById('total-usage');

        // Profile Elements
        this.btnProfile = document.getElementById('btn-profile');
        this.profileModal = document.getElementById('profile-modal');
        this.btnCloseProfile = document.getElementById('btn-close-profile');

        // Usage Data Elements
        this.usageDay = document.getElementById('usage-day');
        this.usageWeek = document.getElementById('usage-week');
        this.usageMonth = document.getElementById('usage-month');
        this.usageAll = document.getElementById('usage-all');
    }

    initEventListeners() {
        this.connectBtn.addEventListener('click', () => this.toggleConnection());

        this.btnMinimize.addEventListener('click', () => {
            appWindow.minimize();
        });

        this.btnClose.addEventListener('click', () => {
            appWindow.close();
        });

        // Profile Modal Listeners
        if (this.btnProfile) {
            this.btnProfile.addEventListener('click', () => this.openProfileModal());
        }
        if (this.btnCloseProfile) {
            this.btnCloseProfile.addEventListener('click', () => this.closeProfileModal());
        }
        if (this.profileModal) {
            this.profileModal.addEventListener('click', (e) => {
                if (e.target === this.profileModal) this.closeProfileModal();
            });
        }
    }

    openProfileModal() {
        this.updateUsageStats();
        this.profileModal.classList.add('active');
    }

    closeProfileModal() {
        this.profileModal.classList.remove('active');
    }

    initSettingsInfo() {
        this.btnSettings = document.getElementById('btn-settings');
        this.settingsModal = document.getElementById('settings-modal');
        this.btnCloseSettings = document.getElementById('btn-close-settings');
        this.toggleLightMode = document.getElementById('toggle-light-mode');

        // Load saved setting
        const savedLightMode = localStorage.getItem('performance-light-mode') === 'true';
        if (savedLightMode) {
            document.body.classList.add('performance-light');
            if (this.toggleLightMode) this.toggleLightMode.checked = true;
        }

        // Event Listeners
        if (this.btnSettings) {
            this.btnSettings.addEventListener('click', () => {
                this.settingsModal.classList.add('active');
            });
        }

        if (this.btnCloseSettings) {
            this.btnCloseSettings.addEventListener('click', () => {
                this.settingsModal.classList.remove('active');
            });
        }

        if (this.settingsModal) {
            this.settingsModal.addEventListener('click', (e) => {
                if (e.target === this.settingsModal) this.settingsModal.classList.remove('active');
            });
        }

        if (this.toggleLightMode) {
            this.toggleLightMode.addEventListener('change', (e) => {
                const isLight = e.target.checked;
                if (isLight) {
                    document.body.classList.add('performance-light');
                    localStorage.setItem('performance-light-mode', 'true');
                } else {
                    document.body.classList.remove('performance-light');
                    localStorage.setItem('performance-light-mode', 'false');
                }
            });
        }
    }

    async updateUsageStats() {
        try {
            const stats = await invoke('get_usage');
            // stats: { day, week, month, all } in bytes
            if (this.usageDay) this.usageDay.textContent = this.formatData(stats.day);
            if (this.usageWeek) this.usageWeek.textContent = this.formatData(stats.week);
            if (this.usageMonth) this.usageMonth.textContent = this.formatData(stats.month);
            if (this.usageAll) this.usageAll.textContent = this.formatData(stats.all);
        } catch (error) {
            console.error('Failed to update usage stats:', error);
            if (this.usageDay) this.usageDay.textContent = '--';
            if (this.usageWeek) this.usageWeek.textContent = '--';
            if (this.usageMonth) this.usageMonth.textContent = '--';
            if (this.usageAll) this.usageAll.textContent = '--';
        }
    }

    async initTauriListeners() {
        // Listen for Xray Stats from Rust backend
        await listen('xray-stats', (event) => {
            try {
                let data = event.payload;
                if (typeof data === 'string') {
                    data = JSON.parse(data);
                }
                this.processStats(data);
            } catch (e) {
                console.error('Stats parse error:', e);
            }
        });
    }

    processStats(data) {
        if (!data || !data.stat) return;

        let up = 0;
        let down = 0;

        // Only count outbound>>>proxy traffic to avoid double/triple counting.
        // Xray reports stats at multiple levels (inbound, outbound, user) and
        // summing all of them inflates the real numbers by 2-3x.
        data.stat.forEach(item => {
            const name = item.name || '';
            if (!name.startsWith('outbound>>>proxy>>>')) return;

            const val = parseInt(item.value);
            if (!isNaN(val)) {
                if (name.includes('uplink')) up += val;
                if (name.includes('downlink')) down += val;
            }
        });

        const now = Date.now();
        const deltaT = (now - this.lastStats.timestamp) / 1000;

        let upSpeed = 0;
        let downSpeed = 0;

        if (deltaT > 0) {
            upSpeed = Math.max(0, (up - this.lastStats.up) / deltaT);
            downSpeed = Math.max(0, (down - this.lastStats.down) / deltaT);
        }

        // NaN protection
        upSpeed = isNaN(upSpeed) ? 0 : upSpeed;
        downSpeed = isNaN(downSpeed) ? 0 : downSpeed;

        this.lastStats = { up, down, timestamp: now };

        this.updateTrafficUI({
            upSpeed,
            downSpeed,
            total: up + down
        });
    }

    updateTrafficUI(data) {
        if (!this.isConnected) return;
        if (this.downloadSpeed) this.downloadSpeed.textContent = this.formatSpeed(data.downSpeed);
        if (this.uploadSpeed) this.uploadSpeed.textContent = this.formatSpeed(data.upSpeed);
        if (this.totalUsage) this.totalUsage.textContent = this.formatData(data.total);
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

    async toggleConnection() {
        if (this.isConnecting) return;

        this.hideError();
        this.triggerRipple();
        this.triggerRipple(); // Double ripple

        if (this.isConnected) {
            await this.disconnect();
        } else {
            await this.connect();
        }
    }

    async connect() {
        this.setConnectingState();

        try {
            const result = await invoke('start_vpn');
            console.log('VPN Started:', result);
            this.setConnectedState();
        } catch (error) {
            console.error('VPN Error:', error);
            this.setDisconnectedState();
            this.showError(error || 'Bağlantı kurulamadı');
        }
    }

    async disconnect() {
        this.triggerScreenFlash('flash-disconnect');

        try {
            await invoke('stop_vpn');
            this.setDisconnectedState();
        } catch (error) {
            console.error('Disconnect error:', error);
            this.setDisconnectedState();
        }
    }

    // =========================================
    //            ANIMATION ENGINE
    // =========================================

    triggerScreenFlash(className) {
        if (!this.screenFlash) return;
        this.screenFlash.className = 'screen-flash';
        void this.screenFlash.offsetWidth;
        this.screenFlash.classList.add(className);
        this.screenFlash.addEventListener('animationend', () => {
            this.screenFlash.className = 'screen-flash';
        }, { once: true });
    }

    triggerRipple() {
        if (!this.rippleContainer) return;
        const ripple = document.createElement('div');
        ripple.classList.add('ripple', 'animate');
        this.rippleContainer.appendChild(ripple);
        ripple.addEventListener('animationend', () => ripple.remove());
    }

    triggerShockwave() {
        if (!this.shockwave) return;
        this.shockwave.classList.remove('animate');
        void this.shockwave.offsetWidth;
        this.shockwave.classList.add('animate');
        this.shockwave.addEventListener('animationend', () => {
            this.shockwave.classList.remove('animate');
        }, { once: true });
    }

    triggerSuccessBurst() {
        this.triggerScreenFlash('flash-success');
    }

    animateStatusText(text) {
        if (!this.statusText) return;
        this.statusText.classList.remove('animate-change');
        void this.statusText.offsetWidth;

        const originalText = text;
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&";
        let iterations = 0;

        if (this.textInterval) clearInterval(this.textInterval);

        this.textInterval = setInterval(() => {
            this.statusText.innerText = originalText
                .split("")
                .map((letter, index) => {
                    if (index < iterations) {
                        return originalText[index];
                    }
                    return chars[Math.floor(Math.random() * chars.length)];
                })
                .join("");

            if (iterations >= originalText.length) {
                clearInterval(this.textInterval);
                this.statusText.classList.add('animate-change');
            }

            iterations += 1 / 3;
        }, 30);
    }

    startConnectedParticles() {
        this.stopConnectedParticles();
        if (!this.particlesContainer) return;

        for (let i = 0; i < 5; i++) {
            setTimeout(() => this.spawnFloatingParticle(), i * 300);
        }

        this.ambientParticleInterval = setInterval(() => {
            if (!this.isConnected) return;
            this.spawnFloatingParticle();
        }, 1200);
    }

    stopConnectedParticles() {
        if (this.ambientParticleInterval) {
            clearInterval(this.ambientParticleInterval);
            this.ambientParticleInterval = null;
        }
        if (!this.particlesContainer) return;
        const particles = this.particlesContainer.querySelectorAll('.particle');
        particles.forEach(p => {
            p.style.transition = 'opacity 0.5s';
            p.style.opacity = '0';
            setTimeout(() => p.remove(), 500);
        });
    }

    spawnFloatingParticle() {
        if (!this.particlesContainer) return;
        const particle = document.createElement('div');
        particle.classList.add('particle');

        const size = 2 + Math.random() * 4;
        const startX = Math.random() * 100;
        const tx = (Math.random() - 0.5) * 120;
        const ty = -(150 + Math.random() * 300);
        const duration = 3 + Math.random() * 5;

        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${startX}%`;
        particle.style.bottom = '-10px';
        particle.style.setProperty('--tx', `${tx}px`);
        particle.style.setProperty('--ty', `${ty}px`);
        particle.style.setProperty('--duration', `${duration}s`);
        particle.style.setProperty('--delay', '0s');

        const colors = ['#34d399', '#22d3ee', '#818cf8', '#c084fc', '#00f0ff'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        particle.style.background = color;
        particle.style.boxShadow = `0 0 10px ${color}, 0 0 20px ${color}40`;

        this.particlesContainer.appendChild(particle);
        particle.classList.add('active');

        setTimeout(() => particle.remove(), duration * 1000 + 100);
    }

    // =========================================
    //            STATE MANAGEMENT
    // =========================================

    setConnectingState() {
        this.isConnecting = true;
        this.isConnected = false;

        document.body.className = 'connecting';
        this.animateStatusText('Bağlanıyor...');
        this.connectLabel.textContent = 'Bağlantı kuruluyor';
        if (this.connectionTime) this.connectionTime.style.display = 'none';
        if (this.statsGrid) {
            this.statsGrid.style.display = 'none';
            this.statsGrid.classList.remove('animate-in');
        }
    }

    setConnectedState() {
        this.isConnected = true;
        this.isConnecting = false;
        this.connectionStartTime = Date.now();
        this.lastStats = { up: 0, down: 0, timestamp: Date.now() };

        document.body.className = 'connected';
        this.animateStatusText('Bağlandı');
        this.connectLabel.textContent = 'Bağlantıyı kesmek için dokunun';

        if (this.connectionTime) this.connectionTime.style.display = 'flex';
        if (this.statsGrid) {
            this.statsGrid.style.display = 'grid';
            requestAnimationFrame(() => {
                this.statsGrid.classList.add('animate-in');
            });
        }

        // Reset speed displays
        if (this.downloadSpeed) this.downloadSpeed.textContent = '0.00 KB/s';
        if (this.uploadSpeed) this.uploadSpeed.textContent = '0.00 KB/s';
        if (this.totalUsage) this.totalUsage.textContent = '0.00 MB';

        // Success animations
        this.triggerSuccessBurst();
        this.startConnectedParticles();
        this.startTimer();
        this.hideError();
    }

    setDisconnectedState() {
        this.isConnected = false;
        this.isConnecting = false;
        this.connectionStartTime = null;

        document.body.className = '';
        this.animateStatusText('Bağlantı Kesildi');
        this.connectLabel.textContent = 'Bağlanmak için dokunun';

        if (this.connectionTime) this.connectionTime.style.display = 'none';
        if (this.statsGrid) {
            this.statsGrid.style.display = 'none';
            this.statsGrid.classList.remove('animate-in');
        }

        this.stopConnectedParticles();
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
        if (this.timeDisplay) this.timeDisplay.textContent = '00:00:00';
    }

    showError(message) {
        if (!this.errorContainer) return;
        this.errorText.textContent = message;
        this.errorContainer.style.display = 'block';
        setTimeout(() => this.hideError(), 8000);
    }

    hideError() {
        if (this.errorContainer) this.errorContainer.style.display = 'none';
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    new VPNApp();
});
