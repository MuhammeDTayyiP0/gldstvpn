use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct UsageData {
    pub total: u64,
    pub history: HashMap<String, DailyUsage>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DailyUsage {
    pub up: u64,
    pub down: u64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct UsageStats {
    pub day: u64,
    pub week: u64,
    pub month: u64,
    pub all: u64,
}

impl Default for UsageData {
    fn default() -> Self {
        UsageData {
            total: 0,
            history: HashMap::new(),
        }
    }
}

pub struct UsageStore {
    path: PathBuf,
    data: Mutex<UsageData>,
    last_session: Mutex<(u64, u64)>, // (up, down) cumulative from current session
}

impl UsageStore {
    pub fn new(app_data_dir: PathBuf) -> Self {
        let path = app_data_dir.join("usage-stats.json");
        
        let data = if path.exists() {
            match fs::read_to_string(&path) {
                Ok(raw) => serde_json::from_str(&raw).unwrap_or_default(),
                Err(_) => UsageData::default(),
            }
        } else {
            UsageData::default()
        };

        let store = UsageStore {
            path,
            data: Mutex::new(data),
            last_session: Mutex::new((0, 0)),
        };
        store.save();
        store
    }

    pub fn reset_session(&self) {
        let mut last = self.last_session.lock().unwrap();
        *last = (0, 0);
    }

    /// Called with cumulative session totals (totalUp, totalDown)
    pub fn record_traffic(&self, total_up: u64, total_down: u64) {
        let mut last = self.last_session.lock().unwrap();
        
        let delta_up = if total_up > last.0 { total_up - last.0 } else { 0 };
        let delta_down = if total_down > last.1 { total_down - last.1 } else { 0 };
        
        *last = (total_up, total_down);
        drop(last);

        if delta_up == 0 && delta_down == 0 {
            return;
        }

        let today = chrono::Local::now().format("%Y-%m-%d").to_string();
        
        let mut data = self.data.lock().unwrap();
        let entry = data.history.entry(today).or_insert(DailyUsage { up: 0, down: 0 });
        entry.up += delta_up;
        entry.down += delta_down;
        data.total += delta_up + delta_down;
        drop(data);
        
        self.save();
    }

    pub fn get_stats(&self) -> UsageStats {
        let data = self.data.lock().unwrap();
        let now = chrono::Local::now();
        let today_key = now.format("%Y-%m-%d").to_string();

        let mut day: u64 = 0;
        let mut week: u64 = 0;
        let mut month: u64 = 0;

        if let Some(today_data) = data.history.get(&today_key) {
            day = today_data.up + today_data.down;
        }

        for (date_str, stat) in &data.history {
            if let Ok(entry_date) = chrono::NaiveDate::parse_from_str(date_str, "%Y-%m-%d") {
                let today_date = now.date_naive();
                let diff_days = (today_date - entry_date).num_days().unsigned_abs();
                let daily_total = stat.up + stat.down;

                if diff_days <= 7 {
                    week += daily_total;
                }
                if diff_days <= 30 {
                    month += daily_total;
                }
            }
        }

        UsageStats {
            day,
            week,
            month,
            all: data.total,
        }
    }

    fn save(&self) {
        let data = self.data.lock().unwrap();
        if let Ok(json) = serde_json::to_string_pretty(&*data) {
            let _ = fs::write(&self.path, json);
        }
    }
}
