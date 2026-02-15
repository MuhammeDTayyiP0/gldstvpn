const fs = require('fs');

class ConfigGenerator {
    constructor() {
        this.defaultConfig = {
            address: 'vpn.geldesat.com',
            port: 443,
            uuid: 'bf5d83c2-69c5-47d0-aa13-234cd4f521b0',
            network: 'ws',
            security: 'tls',
            wsPath: '/chat',
            wsHost: 'vpn.geldesat.com',
            sni: 'vpn.geldesat.com',
            socksPort: 10808,
            httpPort: 10809,
        };
    }

    generateConfig(outputPath, customConfig = {}) {
        const config = { ...this.defaultConfig, ...customConfig };

        const xrayConfig = {
            log: {
                loglevel: 'warning',
            },
            stats: {},
            api: {
                tag: 'api',
                services: ['StatsService'],
            },
            policy: {
                levels: {
                    0: {
                        statsUserUplink: true,
                        statsUserDownlink: true,
                    },
                },
                system: {
                    statsInboundUplink: true,
                    statsInboundDownlink: true,
                    statsOutboundUplink: true,
                    statsOutboundDownlink: true,
                },
            },
            inbounds: [
                {
                    tag: 'api',
                    port: 10085,
                    listen: '127.0.0.1',
                    protocol: 'dokodemo-door',
                    settings: {
                        address: '127.0.0.1',
                    },
                },
                {
                    tag: 'socks-in',
                    port: config.socksPort,
                    listen: '127.0.0.1',
                    protocol: 'socks',
                    settings: {
                        auth: 'noauth',
                        udp: true,
                    },
                    sniffing: {
                        enabled: true,
                        destOverride: ['http', 'tls'],
                    },
                },
                {
                    tag: 'http-in',
                    port: config.httpPort,
                    listen: '127.0.0.1',
                    protocol: 'http',
                    settings: {},
                    sniffing: {
                        enabled: true,
                        destOverride: ['http', 'tls'],
                    },
                },
            ],
            outbounds: [
                {
                    tag: 'proxy',
                    protocol: 'vless',
                    settings: {
                        vnext: [
                            {
                                address: config.address,
                                port: config.port,
                                users: [
                                    {
                                        id: config.uuid,
                                        email: 'user@v204.vpn', // Required for stats
                                        encryption: 'none',
                                        level: 0,
                                    },
                                ],
                            },
                        ],
                    },
                    streamSettings: {
                        network: config.network,
                        security: config.security,
                        wsSettings: {
                            path: config.wsPath,
                            headers: {
                                Host: config.wsHost,
                            },
                        },
                        tlsSettings: {
                            serverName: config.sni,
                            allowInsecure: false,
                        },
                    },
                },
                {
                    tag: 'direct',
                    protocol: 'freedom',
                    settings: {},
                },
                {
                    tag: 'block',
                    protocol: 'blackhole',
                    settings: {
                        response: {
                            type: 'http',
                        },
                    },
                },
            ],
            routing: {
                domainStrategy: 'AsIs',
                rules: [
                    {
                        type: 'field',
                        inboundTag: ['api'],
                        outboundTag: 'api',
                    },
                    {
                        type: 'field',
                        outboundTag: 'direct',
                        ip: [
                            '127.0.0.0/8',
                            '10.0.0.0/8',
                            '172.16.0.0/12',
                            '192.168.0.0/16',
                            '::1/128',
                            'fc00::/7',
                            'fe80::/10',
                        ],
                    },
                    {
                        type: 'field',
                        outboundTag: 'direct',
                        domain: [
                            'localhost',
                        ],
                    },
                    {
                        type: 'field',
                        outboundTag: 'proxy',
                        port: '0-65535',
                    },
                ],
            },
        };

        fs.writeFileSync(outputPath, JSON.stringify(xrayConfig, null, 2), 'utf8');
        return xrayConfig;
    }
}

module.exports = ConfigGenerator;
