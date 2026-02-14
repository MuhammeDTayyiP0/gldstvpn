// MTE VPN - Renderer Application Logic v3.0 Ultra Premium

class VPNApp {
    constructor() {
        this.isConnected = false;
        this.isConnecting = false;
        this.connectionStartTime = null;
        this.timerInterval = null;
        this.sparkleInterval = null;
        this.ambientParticleInterval = null;

        this.initElements();
        this.initEventListeners();
        this.initIPCListeners();
        this.checkInitialStatus();
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
        this.globeContainer = document.getElementById('globe-container');
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
            console.log('Minimize button clicked');
            window.vpnAPI.minimize();
        });

        this.btnClose.addEventListener('click', () => {
            console.log('Close button clicked');
            window.vpnAPI.close();
        });

        this.btnClose.addEventListener('click', () => {
            console.log('Close button clicked');
            window.vpnAPI.close();
        });

        // Profile Modal Listeners
        this.btnProfile.addEventListener('click', () => this.openProfileModal());
        this.btnCloseProfile.addEventListener('click', () => this.closeProfileModal());

        // Close on outside click
        this.profileModal.addEventListener('click', (e) => {
            if (e.target === this.profileModal) this.closeProfileModal();
        });
    }

    openProfileModal() {
        this.updateUsageStats();
        this.profileModal.classList.add('active');
    }

    closeProfileModal() {
        this.profileModal.classList.remove('active');
    }

    async updateUsageStats() {
        try {
            const stats = await window.vpnAPI.getUsageStats();
            // stats: { day, week, month, all } (in bytes)

            this.usageDay.textContent = this.formatData(stats.day);
            this.usageWeek.textContent = this.formatData(stats.week);
            this.usageMonth.textContent = this.formatData(stats.month);
            this.usageAll.textContent = this.formatData(stats.all);
        } catch (error) {
            console.error('Failed to update usage stats:', error);
            this.usageDay.textContent = '--';
            this.usageWeek.textContent = '--';
            this.usageMonth.textContent = '--';
            this.usageAll.textContent = '--';
        }
    }



    animateStatusText(text) {
        this.statusText.classList.remove('animate-change');
        void this.statusText.offsetWidth;

        // Cyberpunk Text Decoding Effect
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

    initIPCListeners() {
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

        window.vpnAPI.onTrafficUpdate((data) => {
            this.updateTrafficUI(data);
        });

        window.vpnAPI.onConnectionError((error) => {
            this.showError(error);
        });

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
        this.triggerRipple();
        this.triggerRipple(); // Double ripple for bigger effect

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
        this.triggerScreenFlash('flash-disconnect');

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

    // =========================================
    //            ANIMATION ENGINE
    // =========================================

    triggerScreenFlash(className) {
        this.screenFlash.className = 'screen-flash';
        void this.screenFlash.offsetWidth;
        this.screenFlash.classList.add(className);
        this.screenFlash.addEventListener('animationend', () => {
            this.screenFlash.className = 'screen-flash';
        }, { once: true });
    }

    triggerRipple() {
        const ripple = document.createElement('div');
        ripple.classList.add('ripple', 'animate');
        this.rippleContainer.appendChild(ripple);
        ripple.addEventListener('animationend', () => ripple.remove());
    }

    triggerShockwave() {
        this.shockwave.classList.remove('animate');
        void this.shockwave.offsetWidth;
        this.shockwave.classList.add('animate');
        this.shockwave.addEventListener('animationend', () => {
            this.shockwave.classList.remove('animate');
        }, { once: true });
    }

    triggerSuccessBurst() {
        // Screen flash
        this.triggerScreenFlash('flash-success');
    }





    animateStatusText(text) {
        this.statusText.classList.remove('animate-change');
        void this.statusText.offsetWidth;
        this.statusText.textContent = text;
        this.statusText.classList.add('animate-change');
    }

    startConnectedParticles() {
        this.stopConnectedParticles();

        // Spawn initial burst
        for (let i = 0; i < 5; i++) {
            setTimeout(() => this.spawnFloatingParticle(), i * 300);
        }

        // Continuous particles
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
        // Fade out existing particles
        const particles = this.particlesContainer.querySelectorAll('.particle');
        particles.forEach(p => {
            p.style.transition = 'opacity 0.5s';
            p.style.opacity = '0';
            setTimeout(() => p.remove(), 500);
        });
    }

    spawnFloatingParticle() {
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
        this.connectionTime.style.display = 'none';
        this.statsGrid.style.display = 'none';
        this.statsGrid.classList.remove('animate-in');
    }

    setConnectedState() {
        this.isConnected = true;
        this.isConnecting = false;
        this.connectionStartTime = Date.now();

        document.body.className = 'connected';
        this.animateStatusText('Bağlandı');
        this.connectLabel.textContent = 'Bağlantıyı kesmek için dokunun';
        this.connectionTime.style.display = 'flex';
        this.statsGrid.style.display = 'grid';

        // Staggered stats animation
        requestAnimationFrame(() => {
            this.statsGrid.classList.add('animate-in');
        });

        // MASSIVE success animation sequence
        this.triggerSuccessBurst();

        // Start ambient particles
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
        this.connectionTime.style.display = 'none';
        this.statsGrid.style.display = 'none';
        this.statsGrid.classList.remove('animate-in');

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
        this.timeDisplay.textContent = '00:00:00';
    }

    showError(message) {
        this.errorText.textContent = message;
        this.errorContainer.style.display = 'block';
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
