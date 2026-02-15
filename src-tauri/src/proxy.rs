use std::process::Command;

/// Manages Windows system proxy settings via the registry.
/// This is the critical missing piece that routes system traffic through Xray.
pub struct ProxySettings;

impl ProxySettings {
    /// Enable the Windows system proxy, pointing to the Xray HTTP proxy.
    pub fn enable(host: &str, http_port: u16) -> Result<(), String> {
        let proxy_address = format!("{}:{}", host, http_port);
        
        println!("[Proxy] Enabling system proxy: {}", proxy_address);

        // Enable proxy
        Self::run_reg_command(&[
            "add",
            r"HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings",
            "/v", "ProxyEnable",
            "/t", "REG_DWORD",
            "/d", "1",
            "/f",
        ])?;

        // Set proxy server address
        Self::run_reg_command(&[
            "add",
            r"HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings",
            "/v", "ProxyServer",
            "/t", "REG_SZ",
            "/d", &proxy_address,
            "/f",
        ])?;

        // Bypass local addresses
        let bypass = "localhost;127.*;10.*;172.16.*;172.17.*;172.18.*;172.19.*;172.20.*;172.21.*;172.22.*;172.23.*;172.24.*;172.25.*;172.26.*;172.27.*;172.28.*;172.29.*;172.30.*;172.31.*;192.168.*;<local>";
        Self::run_reg_command(&[
            "add",
            r"HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings",
            "/v", "ProxyOverride",
            "/t", "REG_SZ",
            "/d", bypass,
            "/f",
        ])?;

        println!("[Proxy] System proxy enabled successfully.");
        Ok(())
    }

    /// Disable the Windows system proxy.
    pub fn disable() -> Result<(), String> {
        println!("[Proxy] Disabling system proxy...");

        Self::run_reg_command(&[
            "add",
            r"HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings",
            "/v", "ProxyEnable",
            "/t", "REG_DWORD",
            "/d", "0",
            "/f",
        ])?;

        println!("[Proxy] System proxy disabled.");
        Ok(())
    }

    fn run_reg_command(args: &[&str]) -> Result<(), String> {
        let output = Command::new("reg")
            .args(args)
            .output()
            .map_err(|e| format!("Failed to run reg command: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Registry command failed: {}", stderr));
        }
        Ok(())
    }
}
