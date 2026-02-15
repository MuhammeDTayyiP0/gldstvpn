use serde::{Deserialize, Serialize};

use std::fs;
use std::path::PathBuf;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Config {
    pub address: String,
    pub port: u16,
    pub uuid: String,
    pub network: String,
    pub security: String,
    pub ws_path: String,
    pub ws_host: String,
    pub sni: String,
    pub socks_port: u16,
    pub http_port: u16,
}

impl Default for Config {
    fn default() -> Self {
        Config {
            address: "vpn.geldesat.com".to_string(),
            port: 443,
            uuid: "bf5d83c2-69c5-47d0-aa13-234cd4f521b0".to_string(),
            network: "ws".to_string(),
            security: "tls".to_string(),
            ws_path: "/chat".to_string(),
            ws_host: "vpn.geldesat.com".to_string(),
            sni: "vpn.geldesat.com".to_string(),
            socks_port: 10808,
            http_port: 10809,
        }
    }
}

pub fn generate_config(output_path: PathBuf, custom: Option<Config>) -> Result<(), Box<dyn std::error::Error>> {
    let config = custom.unwrap_or_default();
    
    let xray_config = serde_json::json!({
        "log": {
            "loglevel": "warning"
        },
        "stats": {},
        "api": {
            "tag": "api",
            "services": ["StatsService"]
        },
        "policy": {
            "levels": {
                "0": {
                    "statsUserUplink": true,
                    "statsUserDownlink": true
                }
            },
            "system": {
                "statsInboundUplink": true,
                "statsInboundDownlink": true,
                "statsOutboundUplink": true,
                "statsOutboundDownlink": true
            }
        },
        "inbounds": [
            {
                "tag": "api",
                "port": 10085,
                "listen": "127.0.0.1",
                "protocol": "dokodemo-door",
                "settings": {
                    "address": "127.0.0.1"
                }
            },
            {
                "tag": "socks-in",
                "port": config.socks_port,
                "listen": "127.0.0.1",
                "protocol": "socks",
                "settings": {
                    "auth": "noauth",
                    "udp": true
                },
                "sniffing": {
                    "enabled": true,
                    "destOverride": ["http", "tls"]
                }
            },
            {
                "tag": "http-in",
                "port": config.http_port,
                "listen": "127.0.0.1",
                "protocol": "http",
                "settings": {},
                "sniffing": {
                    "enabled": true,
                    "destOverride": ["http", "tls"]
                }
            }
        ],
        "outbounds": [
            {
                "tag": "proxy",
                "protocol": "vless",
                "settings": {
                    "vnext": [
                        {
                            "address": config.address,
                            "port": config.port,
                            "users": [
                                {
                                    "id": config.uuid,
                                    "email": "user@v204.vpn",
                                    "encryption": "none",
                                    "level": 0
                                }
                            ]
                        }
                    ]
                },
                "streamSettings": {
                    "network": config.network,
                    "security": config.security,
                    "wsSettings": {
                        "path": config.ws_path,
                        "headers": {
                            "Host": config.ws_host
                        }
                    },
                    "tlsSettings": {
                        "serverName": config.sni,
                        "allowInsecure": false
                    }
                }
            },
            {
                "tag": "direct",
                "protocol": "freedom",
                "settings": {}
            },
            {
                "tag": "block",
                "protocol": "blackhole",
                "settings": {
                    "response": {
                        "type": "http"
                    }
                }
            }
        ],
        "routing": {
            "domainStrategy": "AsIs",
            "rules": [
                {
                    "type": "field",
                    "inboundTag": ["api"],
                    "outboundTag": "api"
                },
                {
                    "type": "field",
                    "outboundTag": "direct",
                    "ip": [
                        "127.0.0.0/8",
                        "10.0.0.0/8",
                        "172.16.0.0/12",
                        "192.168.0.0/16",
                        "::1/128",
                        "fc00::/7",
                        "fe80::/10"
                    ]
                },
                {
                    "type": "field",
                    "outboundTag": "direct",
                    "domain": [
                        "localhost"
                    ]
                },
                {
                    "type": "field",
                    "outboundTag": "proxy",
                    "port": "0-65535"
                }
            ]
        }
    });

    let json_string = serde_json::to_string_pretty(&xray_config)?;
    fs::write(output_path, json_string)?;
    Ok(())
}
