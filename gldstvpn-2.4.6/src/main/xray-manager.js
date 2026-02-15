const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { EventEmitter } = require('events');
const ConfigGenerator = require('./config-generator');

class XrayManager extends EventEmitter {
    constructor() {
        super();
        this.process = null;
        this.running = false;
        this.configGenerator = new ConfigGenerator();
        this.startTime = null;
    }

    getXrayBinaryPath() {
        const isPackaged = process.resourcesPath !== undefined;
        const platform = process.platform;
        const binaryName = platform === 'win32' ? 'xray.exe' : 'xray';

        // Check in resources directory (for packaged app)
        const packagedPath = path.join(process.resourcesPath || '', 'xray', binaryName);
        if (fs.existsSync(packagedPath)) {
            return packagedPath;
        }

        // Check in project resources directory (for development)
        const devPath = path.join(__dirname, '..', '..', 'resources', 'xray', binaryName);
        if (fs.existsSync(devPath)) {
            return devPath;
        }

        throw new Error(
            `Xray-core binary bulunamadı!\n` +
            `Lütfen xray binary dosyasını şu konuma yerleştirin:\n` +
            `${devPath}\n\n` +
            `İndirmek için: https://github.com/XTLS/Xray-core/releases`
        );
    }

    getConfigPath() {
        const { app } = require('electron');
        const userDataPath = app.getPath('userData');
        const configDir = path.join(userDataPath, 'xray-config');

        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        return path.join(configDir, 'config.json');
    }

    async start() {
        if (this.running) {
            this.emit('log', 'Xray-core zaten çalışıyor.');
            return;
        }

        try {
            // Generate config
            const configPath = this.getConfigPath();
            this.configGenerator.generateConfig(configPath);
            this.emit('log', 'Yapılandırma dosyası oluşturuldu.');

            // Find binary
            const binaryPath = this.getXrayBinaryPath();
            this.emit('log', `Xray-core başlatılıyor: ${binaryPath}`);

            // Make binary executable on Linux
            if (process.platform !== 'win32') {
                try {
                    fs.chmodSync(binaryPath, '755');
                } catch (e) {
                    // Ignore permission errors
                }
            }

            // Start Xray-core
            return new Promise((resolve, reject) => {
                const binaryDir = path.dirname(binaryPath);
                let stderrOutput = '';

                this.process = spawn(binaryPath, ['-c', configPath], {
                    stdio: ['pipe', 'pipe', 'pipe'],
                    cwd: binaryDir,
                });

                let started = false;
                const startTimeout = setTimeout(() => {
                    if (!started) {
                        started = true;
                        // Assume it started successfully after 3 seconds
                        this.running = true;
                        this.startTime = Date.now();
                        this.startStatsPolling();
                        this.emit('log', 'Xray-core başlatıldı (timeout).');
                        resolve();
                    }
                }, 3000);

                this.process.stdout.on('data', (data) => {
                    const output = data.toString().trim();
                    this.emit('log', output);

                    if (!started && output.includes('started')) {
                        started = true;
                        clearTimeout(startTimeout);
                        this.running = true;
                        this.startTime = Date.now();
                        this.startStatsPolling();
                        this.emit('log', 'Xray-core başarıyla başlatıldı.');
                        resolve();
                    }
                });

                this.process.stderr.on('data', (data) => {
                    const output = data.toString().trim();
                    stderrOutput += output + '\n';
                    this.emit('log', `[STDERR] ${output}`);
                });

                this.process.on('error', (error) => {
                    this.running = false;
                    this.startTime = null;
                    clearTimeout(startTimeout);
                    this.stopStatsPolling();
                    this.emit('error', `Xray-core başlatılamadı: ${error.message}`);
                    if (!started) {
                        started = true;
                        reject(error);
                    }
                });

                this.process.on('close', (code) => {
                    this.running = false;
                    this.startTime = null;
                    this.stopStatsPolling();
                    this.emit('log', `Xray-core kapandı (kod: ${code})`);
                    if (!started) {
                        started = true;
                        clearTimeout(startTimeout);
                        if (code !== 0) {
                            const errorMsg = stderrOutput.trim() || `Xray-core hata ile kapandı: ${code}`;
                            reject(new Error(errorMsg));
                        }
                    }
                });
            });
        } catch (error) {
            this.emit('error', error.message);
            throw error;
        }
    }

    startStatsPolling() {
        this.stopStatsPolling();

        // Initial stats
        this.lastStats = {
            up: 0,
            down: 0,
            time: Date.now()
        };

        this.statsInterval = setInterval(() => {
            if (!this.running) return;
            this.queryStats();
        }, 1000);
    }

    stopStatsPolling() {
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
            this.statsInterval = null;
        }
    }

    queryStats() {
        const binaryPath = this.getXrayBinaryPath();
        const binaryDir = path.dirname(binaryPath);

        const apiProcess = spawn(binaryPath, ['api', 'statsquery', '--server=127.0.0.1:10085'], {
            cwd: binaryDir
        });

        let output = '';
        let errorOutput = '';

        apiProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        apiProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        apiProcess.on('close', (code) => {
            if (code === 0) {
                try {
                    if (output.trim()) {
                        const stats = JSON.parse(output);
                        this.processStats(stats);
                    }
                } catch (e) {
                    this.emit('log', `Stats JSON Parse Hatası: ${e.message}`);
                }
            } else {
                this.emit('log', `Xray API sorgusu başarısız (kod ${code}): ${errorOutput.trim()}`);
            }
        });
    }

    processStats(data) {
        if (!data || !data.stat) return;

        let up = 0;
        let down = 0;

        data.stat.forEach(item => {
            const val = parseInt(item.value);
            if (!isNaN(val)) {
                if (item.name.includes('uplink')) up += val;
                if (item.name.includes('downlink')) down += val;
            }
        });

        const now = Date.now();
        const deltaTime = (now - this.lastStats.time) / 1000;

        // Safety check for speed calculation
        let upSpeed = 0;
        let downSpeed = 0;

        if (deltaTime > 0) {
            upSpeed = Math.max(0, (up - this.lastStats.up) / deltaTime);
            downSpeed = Math.max(0, (down - this.lastStats.down) / deltaTime);
        }

        // Final NaN protection
        upSpeed = isNaN(upSpeed) ? 0 : upSpeed;
        downSpeed = isNaN(downSpeed) ? 0 : downSpeed;

        this.lastStats = { up, down, time: now };

        this.emit('traffic', {
            upSpeed, // bytes per second
            downSpeed, // bytes per second
            totalUp: up,
            totalDown: down,
            total: up + down
        });
    }

    async stop() {
        if (!this.process || !this.running) {
            this.running = false;
            this.stopStatsPolling();
            return;
        }

        return new Promise((resolve) => {
            this.process.on('close', () => {
                this.running = false;
                this.startTime = null;
                this.process = null;
                this.stopStatsPolling();
                this.emit('log', 'Xray-core durduruldu.');
                resolve();
            });

            // Try graceful kill first
            if (process.platform === 'win32') {
                spawn('taskkill', ['/pid', this.process.pid, '/f', '/t']);
            } else {
                this.process.kill('SIGTERM');
            }

            // Force kill after 5 seconds
            setTimeout(() => {
                if (this.process) {
                    try {
                        this.process.kill('SIGKILL');
                    } catch (e) {
                        // Process might already be dead
                    }
                }
                resolve();
            }, 5000);
        });
    }

    isRunning() {
        return this.running;
    }

    getUptime() {
        if (!this.startTime) return 0;
        return Math.floor((Date.now() - this.startTime) / 1000);
    }

    getServerInfo() {
        return {
            address: 'vpn.geldesat.com',
            port: 443,
            protocol: 'VLESS',
            network: 'WebSocket',
            security: 'TLS',
            uptime: this.getUptime(),
        };
    }
}

module.exports = XrayManager;
