// V204 VPN - Ultra Premium UI Logic (v3.3.1)
const invoke = window.__TAURI__.core.invoke;
const appWindow = window.__TAURI__.window.getCurrentWindow();
const { listen } = window.__TAURI__.event;

class VPNApp {
    constructor() {
        this.isConnected = false;
        this.isConnecting = false;
        this.connectionStartTime = null;
        this.timerInterval = null;
        this.lastStats = { up: 0, down: 0, timestamp: Date.now() };

        this.initElements();
        this.initSettings();
        this.initEventListeners();
        this.initTauriListeners();
    }

    initElements() {
        // Helper to safely get element
        const get = (id) => {
            const el = document.getElementById(id);
            if (!el) console.warn(`Element not found: ${id}`);
            return el;
        };

        // Main Controls
        this.titlebar = get('titlebar');
        this.connectBtn = get('connect-btn');
        this.statusText = get('status-text');
        this.connectLabel = get('connect-label');
        this.errorContainer = get('error-container');
        this.errorText = get('error-text');

        // Timer
        this.timeDisplay = get('connection-time');

        // Stats
        this.downloadSpeed = get('download-speed');
        this.uploadSpeed = get('upload-speed');
        this.totalUsage = get('total-usage');

        // Titlebar Buttons
        this.btnMinimize = get('btn-minimize');
        this.btnClose = get('btn-close');

        // Modals
        this.btnSettings = get('btn-settings');
        this.settingsModal = get('settings-modal');
        this.btnCloseSettings = get('btn-close-settings');

        this.btnProfile = get('btn-profile');
        this.profileModal = get('profile-modal');
        this.btnCloseProfile = get('btn-close-profile');

        // Profile Stats
        this.usageDay = get('usage-day');
        this.usageWeek = get('usage-week');
        this.usageMonth = get('usage-month');
        this.usageAll = get('usage-all');
    }

    initEventListeners() {
        this.connectBtn.addEventListener('click', () => this.toggleConnection());

        // Window Controls
        this.titlebar.addEventListener('mousedown', (e) => {
            if (e.target.closest('button')) return;
            appWindow.startDragging();
        });

        this.btnMinimize.addEventListener('click', () => appWindow.minimize());
        this.btnClose.addEventListener('click', () => appWindow.close());

        // Modals
        this.btnSettings.addEventListener('click', () => this.settingsModal.classList.add('active'));
        this.btnCloseSettings.addEventListener('click', () => this.settingsModal.classList.remove('active'));
        this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) this.settingsModal.classList.remove('active');
        });

        this.btnProfile.addEventListener('click', () => {
            this.updateUsageStats();
            this.profileModal.classList.add('active');
        });
        this.btnCloseProfile.addEventListener('click', () => this.profileModal.classList.remove('active'));
        this.profileModal.addEventListener('click', (e) => {
            if (e.target === this.profileModal) this.profileModal.classList.remove('active');
        });
    }

    initSettings() {
        // Graphics Quality Logic
        // 0 = Standard (Fastest/Simplest) -> Maps to perf-4
        // 4 = Ultra (Best Visuals) -> Maps to base CSS
        const slider = document.getElementById('perf-slider');
        const label = document.getElementById('perf-level-label');
        const labels = ['Standard', 'Balanced', 'High', 'Ultra', 'Max'];

        // Map slider (0-4) to CSS classes
        // 0 -> perf-4 (Standard - No Shadows/Anim/Blur/Orb)
        // 1 -> perf-3 (Balanced - No Blur/Orb)
        // 2 -> perf-2 (High - No Orb, but Blur is ON)
        // 3 -> perf-1 (Ultra - Orb is ON, but maybe simplified) - Actually Orb is removed in perf-1 CSS above?
        // Let's align JS with CSS comments:
        // perf-4: No Orb, No Blur, No Shadow/Anim
        // perf-3: No Orb, No Blur
        // perf-2: No Orb (Blur ON)
        // perf-1: Gradient/Orb OFF? Wait, CSS says perf-1 removes orb.

        // CSS Logic:
        // perf-1,2,3,4 remove ORB.
        // So Level 4 (Max, no class) has Orb.
        // Level 3 (Ultra, perf-1) has No Orb.

        // Correct Mapping:
        const classMap = ['perf-4', 'perf-3', 'perf-2', 'perf-1', ''];

        const updatePerf = (val) => {
            val = parseInt(val);
            document.body.className = document.body.className.replace(/perf-\d/g, '');
            const cls = classMap[val];
            if (cls) document.body.classList.add(cls);

            if (label) label.textContent = labels[val];
            localStorage.setItem('perf-level', val);
        };

        // Default to 4 (Max) if not set, or user's preference
        // User asked for "Standard" to be simple. Let's default to verified user's preference or Max.
        // Actually, let's look at what user said: "bu en basit standart olan olsun" implies he wants 0 to be the start.
        // But previously saved '0' meant 'Base'.
        // If I merely invert logic, old users with '0' will suddenly get 'perf-4' (Ugly).
        // That's acceptable for a "Standard" label.

        const saved = localStorage.getItem('perf-level') !== null ? localStorage.getItem('perf-level') : 1;

        if (slider) {
            slider.value = saved;
            updatePerf(saved);
            slider.addEventListener('input', (e) => {
                updatePerf(e.target.value);
            });
        }
    }

    async toggleConnection() {
        if (this.isConnecting) return;

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
            // console.log('VPN Started:', result);
            this.setConnectedState();
        } catch (error) {
            console.error('VPN Error:', error);
            this.setDisconnectedState();
            this.showError(error || 'Bağlantı Başarısız');
        }
    }

    async disconnect() {
        try {
            await invoke('stop_vpn');
        } catch (error) {
            console.error('Disconnect error:', error);
        } finally {
            this.setDisconnectedState();
        }
    }

    // Helper for safe text updates
    setText(el, text) {
        if (el) el.textContent = text;
    }

    // State Management
    setConnectingState() {
        this.isConnecting = true;
        document.body.classList.remove('connected');
        document.body.classList.add('connecting');

        this.setText(this.statusText, 'CONNECTING...');
        this.setText(this.connectLabel, 'Establishing secure tunnel...');
        if (this.errorContainer) this.errorContainer.style.opacity = '0';
    }

    setConnectedState() {
        this.isConnected = true;
        this.isConnecting = false;
        this.connectionStartTime = Date.now();

        document.body.classList.remove('connecting');
        document.body.classList.add('connected');

        this.setText(this.statusText, 'CONNECTED');
        this.setText(this.connectLabel, 'Tap to Disconnect');
        // Clear inline opacity so CSS hover/connected state works
        if (this.connectLabel) this.connectLabel.style.opacity = '';

        this.startTimer();
    }

    setDisconnectedState() {
        this.isConnected = false;
        this.isConnecting = false;

        document.body.classList.remove('connecting', 'connected');

        this.setText(this.statusText, 'DISCONNECTED');
        this.setText(this.connectLabel, 'Tap to Connect');
        if (this.connectLabel) {
            this.connectLabel.style.opacity = '1';
            this.connectLabel.style.pointerEvents = 'auto';
        }

        this.stopTimer();

        // Reset stats
        this.setText(this.downloadSpeed, '0.00 KB/s');
        this.setText(this.uploadSpeed, '0.00 KB/s');
    }

    // Timer Logic
    startTimer() {
        this.stopTimer();
        this.setText(this.timeDisplay, '00:00:00'); // Reset initially
        this.timerInterval = setInterval(() => {
            if (!this.connectionStartTime) return;
            const elapsed = Math.floor((Date.now() - this.connectionStartTime) / 1000);
            const h = Math.floor(elapsed / 3600).toString().padStart(2, '0');
            const m = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
            const s = (elapsed % 60).toString().padStart(2, '0');
            this.setText(this.timeDisplay, `${h}:${m}:${s}`);
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = null;
        this.setText(this.timeDisplay, '00:00:00');
    }

    showError(msg) {
        this.setText(this.errorText, msg);
        if (this.errorContainer) {
            this.errorContainer.style.opacity = '1';
            setTimeout(() => {
                this.errorContainer.style.opacity = '0';
            }, 5000);
        }
    }

    // Stats & Data
    initTauriListeners() {
        listen('xray-stats', (event) => {
            this.processStats(event.payload);
        }).then(() => {
            // console.log('Stats listener registered successfully');
        }).catch(e => {
            console.error('Failed to register stats listener', e);
            this.showError('Stats Error');
        });
    }

    processStats(data) {
        if (!data) return;
        if (typeof data === 'string') {
            try {
                data = JSON.parse(data);
            } catch (e) {
                return;
            }
        }

        if (!data.stat || !Array.isArray(data.stat)) return;

        let up = 0;
        let down = 0;
        let found = false;

        data.stat.forEach(item => {
            const name = item.name || "";
            // Relaxed filter: Count ANY traffic from proxy/inbound to debug "0 issue"
            // We prioritize 'outbound>>>proxy' but if 0, we might want to see 'inbound'
            if (name.includes('traffic>>>')) {
                let val = 0;
                if (typeof item.value === 'number') val = item.value;
                else if (typeof item.value === 'string') val = parseInt(item.value, 10) || 0;

                // Match specific proxy first
                if (name.includes('outbound>>>proxy>>>')) {
                    if (name.endsWith('uplink')) up += val;
                    if (name.endsWith('downlink')) down += val;
                    found = true;
                }
                // Fallback: if we haven't found proxy stats yet, maybe use inbound?
                // Actually, let's just stick to proxy. If proxy is 0, stats are 0.
            }
        });

        // Visual Debug: Turn stats text Green if we got data
        if (up > 0 || down > 0) {
            this.totalUsage.style.color = '#10B981';
        }

        const now = Date.now();
        const delta = (now - this.lastStats.timestamp) / 1000;

        if (delta > 0.1) {
            let diffUp = up - this.lastStats.up;
            let diffDown = down - this.lastStats.down;

            if (diffUp < 0) diffUp = 0; // Reset if restart
            if (diffDown < 0) diffDown = 0;

            const upSpeed = diffUp / delta;
            const downSpeed = diffDown / delta;

            if (this.isConnected) {
                this.setText(this.downloadSpeed, this.formatSpeed(downSpeed));
                this.setText(this.uploadSpeed, this.formatSpeed(upSpeed));
                this.setText(this.totalUsage, this.formatData(up + down));
            }

            this.lastStats = { up, down, timestamp: now };
        } else {
            this.setText(this.totalUsage, this.formatData(up + down));
        }
    }

    async updateUsageStats() {
        try {
            const stats = await invoke('get_usage');
            this.setText(this.usageDay, this.formatData(stats.day));
            this.setText(this.usageWeek, this.formatData(stats.week));
            this.setText(this.usageMonth, this.formatData(stats.month));
            this.setText(this.usageAll, this.formatData(stats.all));
        } catch (e) {
            console.error('Usage fetch failed', e);
        }
    }

    formatSpeed(bytes) {
        if (!bytes || bytes < 0) return '0 B/s';
        if (bytes < 1024) return `${Math.floor(bytes)} B/s`;
        const kb = bytes / 1024;
        if (kb < 1024) return `${kb.toFixed(2)} KB/s`;
        return `${(kb / 1024).toFixed(2)} MB/s`;
    }

    formatData(bytes) {
        if (!bytes || bytes < 0) return '0 B';
        if (bytes < 1024) return `${Math.floor(bytes)} B`;
        const kb = bytes / 1024;
        if (kb < 1024) return `${kb.toFixed(2)} KB`;
        const mb = kb / 1024;
        if (mb < 1024) return `${mb.toFixed(2)} MB`;
        return `${(mb / 1024).toFixed(2)} GB`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new VPNApp();
});
