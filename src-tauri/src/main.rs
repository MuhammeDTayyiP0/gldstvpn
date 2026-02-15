#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use tauri::{
    menu::{Menu, MenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
    Manager, State, AppHandle, Emitter
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
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            let quit_i = MenuItem::with_id(app, "quit", "Çıkış", true, None::<&str>).unwrap();
            let show_i = MenuItem::with_id(app, "show", "Göster", true, None::<&str>).unwrap();
            let menu = Menu::with_items(app, &[&show_i, &quit_i]).unwrap();

            let _tray = TrayIconBuilder::with_id("main")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        let _ = ProxySettings::disable();
                        let state: State<AppState> = app.state();
                        let manager = state.xray_manager.lock().unwrap();
                        if let Some(m) = manager.as_ref() {
                            let _ = m.stop();
                        }
                        std::process::exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_window("main") {
                             let _ = window.show();
                             let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| match event {
                    TrayIconEvent::Click { .. } => {
                       let app = tray.app_handle();
                       if let Some(window) = app.get_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                       }
                    }
                    _ => {}
                })
                .build(app)?;

            let path_resolver = app.path();
            let data_dir = path_resolver.app_data_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
            
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
        .invoke_handler(tauri::generate_handler![start_vpn, stop_vpn, get_usage])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
