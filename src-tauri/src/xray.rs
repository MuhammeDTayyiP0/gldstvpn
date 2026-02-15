use std::process::{Command, Stdio, Child};
#[cfg(windows)]
use std::os::windows::process::CommandExt;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Manager, Emitter};
use std::thread;
use crate::config;
use crate::usage::UsageStore;

pub struct XrayManager {
    process: Arc<Mutex<Option<Child>>>,
    app_handle: AppHandle,
    running: Arc<Mutex<bool>>,
    usage_store: Arc<UsageStore>,
}

impl XrayManager {
    pub fn new(app_handle: AppHandle, usage_store: Arc<UsageStore>) -> Self {
        XrayManager {
            process: Arc::new(Mutex::new(None)),
            app_handle,
            running: Arc::new(Mutex::new(false)),
            usage_store,
        }
    }

    fn get_binary_path(&self) -> Result<PathBuf, String> {
        let binary_name = if cfg!(windows) { "xray.exe" } else { "xray" };
        
        let resource_dir = self.app_handle.path().resource_dir()
            .map_err(|e| format!("Failed to get resource dir: {}", e))?;

        println!("[Xray] resource_dir = {:?}", resource_dir);

        // Possible locations for the binary in production
        let possible_paths = [
            resource_dir.join("xray").join(binary_name),             // Map-based bundling: xray/ subfolder
            resource_dir.join(binary_name),                          // Flattened: direct in resource dir
            resource_dir.join("resources").join("xray").join(binary_name), // Legacy: resources/xray/
            resource_dir.join("resources").join(binary_name),        // Legacy: resources/
        ];

        for p in &possible_paths {
            println!("[Xray] Checking: {:?} -> exists: {}", p, p.exists());
            if p.exists() {
                println!("[Xray] Found binary at: {:?}", p);
                return Ok(p.clone());
            }
        }

        // Fallback or dev paths (Relative to CWD)
        let dev_paths = [
            PathBuf::from("resources").join("xray").join(binary_name),
            PathBuf::from("..").join("resources").join("xray").join(binary_name),
            PathBuf::from(".").join(binary_name),
        ];

        for p in dev_paths {
            println!("[Xray] Checking dev: {:?} -> exists: {}", p, p.exists());
            if p.exists() {
                println!("[Xray] Found binary (dev) at: {:?}", p);
                return Ok(p);
            }
        }

        // List directory contents for debugging
        println!("[Xray] Listing resource_dir contents:");
        if let Ok(entries) = std::fs::read_dir(&resource_dir) {
            for entry in entries.flatten() {
                println!("[Xray]   {:?}", entry.path());
            }
        }
        if let Ok(entries) = std::fs::read_dir(resource_dir.join("xray")) {
            println!("[Xray] Listing resource_dir/xray contents:");
            for entry in entries.flatten() {
                println!("[Xray]   {:?}", entry.path());
            }
        }

        Err(format!("Xray binary not found. resource_dir={:?}, checked {:?}", resource_dir, possible_paths))
    }

    fn get_config_path(&self) -> PathBuf {
        let config_dir = self.app_handle.path()
            .app_data_dir()
            .unwrap_or(PathBuf::from("."));
            
        if !config_dir.exists() {
            let _ = std::fs::create_dir_all(&config_dir);
        }
        
        config_dir.join("config.json")
    }

    pub fn start(&self) -> Result<(), String> {
        let mut running_guard = self.running.lock().unwrap();
        if *running_guard {
            return Err("Xray is already running".to_string());
        }

        let binary_path = self.get_binary_path()?;
        let resource_dir = binary_path.parent().ok_or("Could not find resource directory")?;
        let config_path = self.get_config_path();

        // Always regenerate config to ensure stats/API inbounds are present
        if let Err(e) = config::generate_config(config_path.clone(), None) {
             return Err(format!("Failed to generate config: {}", e));
        }

        println!("Starting Xray with command: {:?} run -config {:?}", binary_path, config_path);

        let mut cmd = Command::new(&binary_path);
        cmd.args(&["run", "-config", config_path.to_str().unwrap()])
            .current_dir(resource_dir)
            .env("XRAY_LOCATION_ASSET", resource_dir)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        #[cfg(windows)]
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        let mut child = cmd.spawn()
            .map_err(|e| format!("Failed to spawn xray: {}", e))?;

        // Monitor stdout
        let stdout = child.stdout.take().unwrap();
        thread::spawn(move || {
            use std::io::{BufRead, BufReader};
            let reader = BufReader::new(stdout);
            for line in reader.lines() {
                if let Ok(l) = line {
                     println!("[Xray Output] {}", l);
                }
            }
        });

        // Monitor stderr
        let stderr = child.stderr.take().unwrap();
        let running_monitor = self.running.clone();
        thread::spawn(move || {
            use std::io::{BufRead, BufReader};
            let reader = BufReader::new(stderr);
            for line in reader.lines() {
                if let Ok(l) = line {
                    if l.contains("error") || l.contains("failed") || l.contains("FATAL") {
                        eprintln!("[Xray Error] {}", l);
                    } else {
                        println!("[Xray Log] {}", l);
                    }
                }
            }
            let mut r = running_monitor.lock().unwrap();
            if *r {
                println!("[Xray] Process stream ended unexpectedly.");
                *r = false;
            }
        });

        // Store child
        let mut process_guard = self.process.lock().unwrap();
        *process_guard = Some(child);
        *running_guard = true;

        // Clone for stats thread
        let running_clone = self.running.clone();
        let app_handle_clone = self.app_handle.clone();
        let binary_path_clone = binary_path.clone();
        let usage_store_clone = self.usage_store.clone();

        // Spawn stats poller
        thread::spawn(move || {
            thread::sleep(Duration::from_secs(3));
            
            loop {
                {
                    let r = running_clone.lock().unwrap();
                    if !*r { break; }
                }

                println!("[Stats Loop] Running query...");
                let mut stats_cmd = Command::new(&binary_path_clone);
                stats_cmd.args(&["api", "statsquery", "--server=127.0.0.1:10085", ""]);
                #[cfg(windows)]
                stats_cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
                let output = stats_cmd.output();

                match output {
                    Ok(out) => {
                        println!("[Stats] Exit Code: {}", out.status);
                        if !out.stderr.is_empty() {
                            println!("[Stats] Stderr: {}", String::from_utf8_lossy(&out.stderr));
                        }
                        
                        if out.status.success() {
                            if let Ok(json_str) = String::from_utf8(out.stdout) {
                                println!("[Stats] Raw JSON: {}", json_str); // DEBUG: Print everything
                                let trimmed = json_str.trim();
                                if !trimmed.is_empty() {
                                    match serde_json::from_str::<serde_json::Value>(trimmed) {
                                        Ok(json_val) => {
                                            // Extract up/down totals for usage tracking
                                            let (total_up, total_down) = extract_totals(&json_val);
                                            println!("[Stats] Extracted - Up: {}, Down: {}", total_up, total_down);
                                            usage_store_clone.record_traffic(total_up, total_down);
                                            
                                            let _ = app_handle_clone.emit("xray-stats", json_val);
                                        }
                                        Err(e) => {
                                            println!("[Stats] JSON parse error: {}", e);
                                        }
                                    }
                                }
                            }
                        }
                    }
                    Err(e) => {
                        println!("[Stats] Failed to run API query: {}", e);
                    }
                }

                thread::sleep(Duration::from_secs(1));
            }
        });

        Ok(())
    }

    pub fn stop(&self) -> Result<(), String> {
        let mut running = self.running.lock().unwrap();
        let mut process = self.process.lock().unwrap();

        if let Some(mut child) = process.take() {
            let _ = child.kill();
            *running = false;
            println!("Xray process stopped.");
        } else {
            *running = false;
        }
        Ok(())
    }
}

/// Extract cumulative up/down byte totals from Xray stats JSON.
/// Only counts outbound>>>proxy traffic to avoid double/triple counting
/// (Xray reports the same bytes at inbound, outbound, and user levels).
fn extract_totals(json: &serde_json::Value) -> (u64, u64) {
    let mut up: u64 = 0;
    let mut down: u64 = 0;
    
    if let Some(stats) = json.get("stat").and_then(|s| s.as_array()) {
        for item in stats {
            let name = item.get("name").and_then(|n| n.as_str()).unwrap_or("");
            
            // Only count outbound>>>proxy to avoid counting each byte 2-3x
            if !name.starts_with("outbound>>>proxy>>>") {
                continue;
            }
            
            let value: u64 = item.get("value")
                .and_then(|v| {
                    v.as_str().and_then(|s| s.parse().ok())
                        .or_else(|| v.as_u64())
                })
                .unwrap_or(0);
            
            if name.contains("uplink") {
                up += value;
            }
            if name.contains("downlink") {
                down += value;
            }
        }
    }
    
    (up, down)
}
