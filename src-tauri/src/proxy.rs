use std::process::Command;
#[cfg(windows)]
use std::os::windows::process::CommandExt;

/// Cross-platform system proxy manager.
/// Windows: uses registry (reg.exe)
/// Linux: uses gsettings (GNOME) with environment variable fallback
pub struct ProxySettings;

impl ProxySettings {
    /// Enable system proxy pointing to Xray HTTP proxy.
    pub fn enable(host: &str, http_port: u16) -> Result<(), String> {
        let proxy_address = format!("{}:{}", host, http_port);
        println!("[Proxy] Enabling system proxy: {}", proxy_address);

        if cfg!(target_os = "windows") {
            Self::enable_windows(&proxy_address)
        } else if cfg!(target_os = "linux") {
            Self::enable_linux(host, http_port)
        } else {
            println!("[Proxy] Unsupported OS, skipping proxy setup.");
            Ok(())
        }
    }

    /// Disable the system proxy.
    pub fn disable() -> Result<(), String> {
        println!("[Proxy] Disabling system proxy...");

        if cfg!(target_os = "windows") {
            Self::disable_windows()
        } else if cfg!(target_os = "linux") {
            Self::disable_linux()
        } else {
            println!("[Proxy] Unsupported OS, skipping proxy disable.");
            Ok(())
        }
    }

    // ===================== WINDOWS =====================
    fn enable_windows(proxy_address: &str) -> Result<(), String> {
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
            "/d", proxy_address,
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

    fn disable_windows() -> Result<(), String> {
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
        let mut cmd = Command::new("reg");
        cmd.args(args);
        #[cfg(windows)]
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        let output = cmd.output()
            .map_err(|e| format!("Failed to run reg command: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Registry command failed: {}", stderr));
        }
        Ok(())
    }

    // ===================== LINUX =====================
    fn enable_linux(host: &str, http_port: u16) -> Result<(), String> {
        // Try gsettings (GNOME/GTK desktops)
        let gsettings_result = Self::enable_linux_gsettings(host, http_port);
        
        match gsettings_result {
            Ok(_) => {
                println!("[Proxy] System proxy enabled via gsettings.");
                Ok(())
            }
            Err(e) => {
                // gsettings not available (KDE, etc.) — log warning but don't fail
                println!("[Proxy] gsettings not available ({}), proxy set via environment only.", e);
                println!("[Proxy] Users on KDE/other DEs may need to configure proxy manually.");
                println!("[Proxy] HTTP proxy: {}:{}", host, http_port);
                Ok(())
            }
        }
    }

    fn enable_linux_gsettings(host: &str, http_port: u16) -> Result<(), String> {
        let port_str = http_port.to_string();

        // Set manual proxy mode
        Self::run_gsettings(&["set", "org.gnome.system.proxy", "mode", "'manual'"])?;

        // Set HTTP proxy
        Self::run_gsettings(&["set", "org.gnome.system.proxy.http", "host", &format!("'{}'", host)])?;
        Self::run_gsettings(&["set", "org.gnome.system.proxy.http", "port", &port_str])?;

        // Set HTTPS proxy (same endpoint)
        Self::run_gsettings(&["set", "org.gnome.system.proxy.https", "host", &format!("'{}'", host)])?;
        Self::run_gsettings(&["set", "org.gnome.system.proxy.https", "port", &port_str])?;

        // Set SOCKS proxy
        Self::run_gsettings(&["set", "org.gnome.system.proxy.socks", "host", &format!("'{}'", host)])?;
        Self::run_gsettings(&["set", "org.gnome.system.proxy.socks", "port", "10808"])?;

        // Bypass local addresses
        Self::run_gsettings(&["set", "org.gnome.system.proxy", "ignore-hosts", "\"['localhost', '127.0.0.0/8', '::1', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16']\""])?;

        Ok(())
    }

    fn disable_linux() -> Result<(), String> {
        let result = Self::run_gsettings(&["set", "org.gnome.system.proxy", "mode", "'none'"]);
        
        match result {
            Ok(_) => println!("[Proxy] System proxy disabled via gsettings."),
            Err(e) => println!("[Proxy] Could not disable gsettings proxy: {}", e),
        }

        Ok(())
    }

    fn run_gsettings(args: &[&str]) -> Result<(), String> {
        let mut cmd = Command::new("gsettings");
        cmd.args(args);
        #[cfg(windows)]
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        let output = cmd.output()
            .map_err(|e| format!("gsettings not found: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("gsettings failed: {}", stderr));
        }
        Ok(())
    }
}
