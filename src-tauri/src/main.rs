#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use tauri::{
    CustomMenuItem, SystemTray, SystemTrayMenu, SystemTrayMenuItem, SystemTrayEvent, 
    Manager, State, AppHandle
};
use std::sync::{Arc, Mutex};

mod config;
mod xray;
mod proxy;
mod usage;

use xray::XrayManager;
use proxy::ProxySettings;
use usage::UsageStore;

// Application State
struct AppState {
    xray_manager: Mutex<Option<XrayManager>>,
    usage_store: Arc<UsageStore>,
}

// Commands
#[tauri::command]
fn start_vpn(state: State<AppState>, app_handle: AppHandle) -> Result<String, String> {
    let mut manager_guard = state.xray_manager.lock().unwrap();
    
    if manager_guard.is_none() {
        *manager_guard = Some(XrayManager::new(app_handle.clone(), state.usage_store.clone()));
    }

    if let Some(manager) = manager_guard.as_ref() {
        state.usage_store.reset_session();
        manager.start().map_err(|e| e.to_string())?;
        // Enable Windows system proxy to route traffic through Xray
        ProxySettings::enable("127.0.0.1", 10809)
            .map_err(|e| format!("Proxy ayarları yapılamadı: {}", e))?;
        Ok("VPN Started".to_string())
    } else {
        Err("Failed to initialize Xray Manager".to_string())
    }
}

#[tauri::command]
fn stop_vpn(state: State<AppState>) -> Result<String, String> {
    // Disable proxy first
    let _ = ProxySettings::disable();
    
    let manager_guard = state.xray_manager.lock().unwrap();
    
    if let Some(manager) = manager_guard.as_ref() {
        manager.stop().map_err(|e| e.to_string())?;
        Ok("VPN Stopped".to_string())
    } else {
        Ok("VPN was not running".to_string())
    }
}

#[tauri::command]
fn get_usage(state: State<AppState>) -> Result<usage::UsageStats, String> {
    Ok(state.usage_store.get_stats())
}

fn main() {
    let quit = CustomMenuItem::new("quit".to_string(), "Çıkış");
    let show = CustomMenuItem::new("show".to_string(), "Göster");
    let tray_menu = SystemTrayMenu::new()
        .add_item(show)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(quit);
  
    let system_tray = SystemTray::new().with_menu(tray_menu);

    tauri::Builder::default()
        .setup(|app| {
            let data_dir = app.path_resolver()
                .app_data_dir()
                .unwrap_or_else(|| std::path::PathBuf::from("."));
            
            if !data_dir.exists() {
                let _ = std::fs::create_dir_all(&data_dir);
            }
            
            let usage_store = Arc::new(UsageStore::new(data_dir));
            app.manage(AppState {
                xray_manager: Mutex::new(None),
                usage_store,
            });
            Ok(())
        })
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::LeftClick { .. } => {
                let window = app.get_window("main").unwrap();
                window.show().unwrap();
                window.set_focus().unwrap();
            }
            SystemTrayEvent::MenuItemClick { id, .. } => {
                match id.as_str() {
                    "quit" => {
                        // Disable proxy and stop VPN before quitting
                        let _ = ProxySettings::disable();
                        let state: State<AppState> = app.state();
                        let manager = state.xray_manager.lock().unwrap();
                        if let Some(m) = manager.as_ref() {
                            let _ = m.stop();
                        }
                        std::process::exit(0);
                    }
                    "show" => {
                        let window = app.get_window("main").unwrap();
                        window.show().unwrap();
                        window.set_focus().unwrap();
                    }
                    _ => {}
                }
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![start_vpn, stop_vpn, get_usage])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
