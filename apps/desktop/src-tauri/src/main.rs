#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use std::net::{TcpStream, ToSocketAddrs};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

use tauri::{window::Color, Manager, Theme, WebviewUrl, WebviewWindowBuilder};

const DASHBOARD_HOST: &str = "127.0.0.1";
const DASHBOARD_PORT: u16 = 4317;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let mut child = None;
                if !dashboard_ready() {
                    child = start_dashboard().ok();
                }
                if wait_for_dashboard(Duration::from_secs(10)) {
                    let _ = WebviewWindowBuilder::new(
                        &handle,
                        "main",
                        WebviewUrl::External(
                            format!("http://{DASHBOARD_HOST}:{DASHBOARD_PORT}")
                                .parse()
                                .expect("valid dashboard url"),
                    ),
                )
                    .theme(Some(Theme::Dark))
                    .background_color(Color(8, 9, 13, 255))
                    .title("Fixmind")
                    .build();
                    if let Some(window) = handle.get_webview_window("splash") {
                        let _ = window.close();
                    }
                } else if let Some(window) = handle.get_webview_window("splash") {
                    let _ = window.set_title("Fixmind - dashboard unavailable");
                }
                drop(child);
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running fixmind desktop");
}

fn dashboard_ready() -> bool {
    TcpStream::connect_timeout(&socket_addr(), Duration::from_millis(200)).is_ok()
}

fn wait_for_dashboard(timeout: Duration) -> bool {
    let start = Instant::now();
    while start.elapsed() < timeout {
        if dashboard_ready() {
            return true;
        }
        std::thread::sleep(Duration::from_millis(200));
    }
    false
}

fn start_dashboard() -> Result<Child, String> {
    let executable = find_fixmind_command().ok_or_else(|| {
        "Could not find the Fixmind CLI on PATH. Install or link `fixmind` first.".to_string()
    })?;
    let mut command = Command::new(executable);
    #[cfg(windows)]
    {
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        command.creation_flags(CREATE_NO_WINDOW);
    }
    command
        .args([
            "dashboard",
            "--no-open",
            "--port",
            &DASHBOARD_PORT.to_string(),
        ])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|error| format!("Could not launch the Fixmind dashboard: {error}"))
}

fn find_fixmind_command() -> Option<PathBuf> {
    let names = if cfg!(windows) {
        vec!["fixmind.cmd", "fixmind.exe", "fixmind"]
    } else {
        vec!["fixmind"]
    };

    let path = env::var_os("PATH")?;
    for dir in env::split_paths(&path) {
        for name in &names {
            let candidate = dir.join(name);
            if candidate.is_file() {
                return Some(candidate);
            }
        }
    }
    None
}

fn socket_addr() -> std::net::SocketAddr {
    (DASHBOARD_HOST, DASHBOARD_PORT)
        .to_socket_addrs()
        .expect("valid dashboard address")
        .next()
        .expect("dashboard address exists")
}
