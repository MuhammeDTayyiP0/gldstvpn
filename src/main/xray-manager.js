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
                    this.emit('error', `Xray-core başlatılamadı: ${error.message}`);
                    if (!started) {
                        started = true;
                        reject(error);
                    }
                });

                this.process.on('close', (code) => {
                    this.running = false;
                    this.startTime = null;
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

    async stop() {
        if (!this.process || !this.running) {
            this.running = false;
            return;
        }

        return new Promise((resolve) => {
            this.process.on('close', () => {
                this.running = false;
                this.startTime = null;
                this.process = null;
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
