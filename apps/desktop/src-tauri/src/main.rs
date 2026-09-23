#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
#[cfg(debug_assertions)]
use std::env;
use std::fs::OpenOptions;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream, ToSocketAddrs};
#[cfg(any(not(debug_assertions), test))]
use std::path::Path;
use std::path::PathBuf;
use std::process::Command;
#[cfg(debug_assertions)]
use std::process::Stdio;
use std::sync::{
    atomic::{AtomicBool, AtomicU16, Ordering},
    Mutex, OnceLock,
};
use std::time::{Duration, Instant};

#[cfg(all(windows, debug_assertions))]
use std::os::windows::process::CommandExt;

#[cfg(not(debug_assertions))]
use tauri::path::BaseDirectory;
use tauri::{window::Color, Manager, Theme, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_notification::NotificationExt;
#[cfg(not(debug_assertions))]
use tauri_plugin_shell::{
    process::{CommandChild, CommandEvent},
    ShellExt,
};

const DASHBOARD_HOST: &str = "127.0.0.1";
static DASHBOARD_PORT: AtomicU16 = AtomicU16::new(0);
static SHUTTING_DOWN: AtomicBool = AtomicBool::new(false);
static SESSION_TOKEN: OnceLock<String> = OnceLock::new();
static STARTUP_STATE: Mutex<&str> = Mutex::new("starting");
static STARTUP_ERROR: Mutex<Option<String>> = Mutex::new(None);
static STARTUP_CATEGORY: Mutex<&str> = Mutex::new("startup");
#[cfg(debug_assertions)]
static DASHBOARD_PROCESS: Mutex<Option<std::process::Child>> = Mutex::new(None);
#[cfg(not(debug_assertions))]
static DASHBOARD_PROCESS: Mutex<Option<CommandChild>> = Mutex::new(None);
const DUE_POLL_FIRST: Duration = Duration::from_secs(60);
const DUE_POLL_INTERVAL: Duration = Duration::from_secs(15 * 60);

fn main() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            startup_status,
            retry_startup,
            restart_fixmind,
            open_logs,
            diagnostics_report
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            match available_port() {
                Ok(port) => {
                    DASHBOARD_PORT.store(port, Ordering::Release);
                    create_main_window(&handle, Some(port))?;
                    start_startup_sequence(handle, port);
                }
                Err(error) => {
                    create_main_window(&handle, None)?;
                    startup_failed(&handle, error);
                }
            }
            let notify_handle = app.handle().clone();
            std::thread::spawn(move || poll_due_reviews(notify_handle));
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building fixmind desktop");
    app.run(|app, event| {
        if matches!(event, tauri::RunEvent::ExitRequested { .. }) {
            shutdown_dashboard(app);
        }
    });
}

fn create_main_window(handle: &tauri::AppHandle, dashboard_port: Option<u16>) -> tauri::Result<()> {
    let session_token = SESSION_TOKEN.get_or_init(generate_session_token).clone();
    let initialization_script = dashboard_port.map_or_else(String::new, |port| {
        format!(
            "if (window.location.origin === 'http://{DASHBOARD_HOST}:{port}') {{ Object.defineProperty(window, '__FIXMIND_SESSION_TOKEN__', {{ value: {}, writable: false, configurable: false, enumerable: false }}); }}",
            serde_json::to_string(&session_token).expect("session token serializes")
        )
    });
    WebviewWindowBuilder::new(handle, "main", WebviewUrl::App("index.html".into()))
        .initialization_script(&initialization_script)
        .title("Fixmind")
        .inner_size(1180.0, 760.0)
        .min_inner_size(760.0, 560.0)
        .center()
        .theme(Some(Theme::Dark))
        .background_color(Color(8, 9, 13, 255))
        .build()
        .map(|_| ())
}

#[derive(Serialize)]
struct StartupStatus {
    state: String,
    category: String,
    message: Option<String>,
}

#[tauri::command]
fn startup_status() -> StartupStatus {
    StartupStatus {
        state: STARTUP_STATE
            .lock()
            .map(|state| (*state).to_string())
            .unwrap_or_else(|_| "failed".to_string()),
        category: STARTUP_CATEGORY
            .lock()
            .map(|category| (*category).to_string())
            .unwrap_or_else(|_| "startup".to_string()),
        message: STARTUP_ERROR.lock().ok().and_then(|error| error.clone()),
    }
}

#[tauri::command]
fn retry_startup(app: tauri::AppHandle) {
    SHUTTING_DOWN.store(false, Ordering::Release);
    stop_dashboard_process();
    set_startup_state("starting", None);
    let port = DASHBOARD_PORT.load(Ordering::Acquire);
    if port == 0 {
        startup_failed(&app, "Restart Fixmind to retry startup.".to_string());
        return;
    }
    start_startup_sequence(app, port);
}

#[tauri::command]
fn restart_fixmind(app: tauri::AppHandle) {
    app.restart();
}

#[tauri::command]
fn open_logs(app: tauri::AppHandle) -> Result<(), String> {
    let log_file = desktop_log_path(&app)?;
    Command::new("explorer.exe")
        .arg(format!("/select,{}", log_file.display()))
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("Could not open the Fixmind logs: {error}"))
}

#[tauri::command]
fn diagnostics_report(app: tauri::AppHandle) -> Result<String, String> {
    let status = startup_status();
    let log_file = desktop_log_path(&app)?;
    Ok(format!(
        "Fixmind startup diagnostics\nState: {}\nPort: {}\nData directory: {}\nLog file: {}\nError: {}",
        status.state,
        DASHBOARD_PORT.load(Ordering::Acquire),
        std::env::var("FIXMIND_DATA_DIR").unwrap_or_else(|_| "<default ~/.fixmind>".to_string()),
        log_file.display(),
        status.message.unwrap_or_else(|| "none".to_string()),
    ))
}

fn start_startup_sequence(handle: tauri::AppHandle, port: u16) {
    tauri::async_runtime::spawn(async move {
        if let Err(error) = start_dashboard(&handle, port) {
            return startup_failed(&handle, error);
        }
        if !wait_for_dashboard(Duration::from_secs(10)) {
            return startup_failed(
                &handle,
                "The local workspace took too long to respond.".to_string(),
            );
        }
        let dashboard_url = format!("http://{DASHBOARD_HOST}:{port}")
            .parse()
            .expect("valid dashboard url");
        match handle.get_webview_window("main") {
            Some(window) => match window.navigate(dashboard_url) {
                Ok(_) => {
                    set_startup_state("ready", None);
                }
                Err(error) => {
                    startup_failed(&handle, format!("Could not open the dashboard: {error}"))
                }
            },
            None => startup_failed(&handle, "The Fixmind window is unavailable.".to_string()),
        }
    });
}

fn startup_failed(handle: &tauri::AppHandle, error: String) {
    write_desktop_log(handle, &error);
    set_startup_state("failed", Some(error));
}

fn set_startup_state(state: &'static str, error: Option<String>) {
    if let Ok(mut current) = STARTUP_STATE.lock() {
        *current = state;
    }
    if let Ok(mut current_error) = STARTUP_ERROR.lock() {
        *current_error = error;
    }
    if let Ok(mut category) = STARTUP_CATEGORY.lock() {
        *category = match STARTUP_ERROR.lock().ok().and_then(|error| error.clone()) {
            Some(error) => classify_startup_error(&error),
            None => "startup",
        };
    }
}

fn classify_startup_error(error: &str) -> &'static str {
    let lower = error.to_ascii_lowercase();
    if lower.contains("resource") || lower.contains("dashboard files") {
        "resources"
    } else if lower.contains("permission") || lower.contains("access") {
        "permissions"
    } else if lower.contains("database") || lower.contains("sqlite") || lower.contains("data") {
        "data"
    } else if lower.contains("sidecar") || lower.contains("dashboard stopped") {
        "server"
    } else {
        "startup"
    }
}

fn dashboard_ready() -> bool {
    let Some(body) = http_get("/api/health") else {
        return false;
    };
    is_fixmind_health_body(&body)
}

fn is_fixmind_health_body(body: &str) -> bool {
    serde_json::from_str::<serde_json::Value>(&body)
        .ok()
        .and_then(|value| value.get("service")?.as_str().map(str::to_owned))
        .as_deref()
        == Some("fixmind-dashboard")
}

fn poll_due_reviews(app: tauri::AppHandle) {
    std::thread::sleep(DUE_POLL_FIRST);
    let mut last_due: Option<u64> = None;
    while !SHUTTING_DOWN.load(Ordering::Acquire) {
        if dashboard_ready() {
            if let Some(due) = fetch_due_count() {
                let should_notify = due > 0 && last_due.map(|last| due > last).unwrap_or(true);
                if should_notify {
                    let _ = app
                        .notification()
                        .builder()
                        .title("Fixmind")
                        .body(format!(
                            "{due} lesson{} due for review.",
                            if due == 1 { "" } else { "s are" }
                        ))
                        .show();
                }
                last_due = Some(due);
            }
        }
        std::thread::sleep(DUE_POLL_INTERVAL);
    }
}

fn fetch_due_count() -> Option<u64> {
    let body = http_get("/api/dashboard?limit=1")?;
    let value: serde_json::Value = serde_json::from_str(&body).ok()?;
    value.get("summary")?.get("due")?.as_u64()
}

fn http_get(path: &str) -> Option<String> {
    if DASHBOARD_PORT.load(Ordering::Acquire) == 0 {
        return None;
    }
    let mut stream = TcpStream::connect_timeout(&socket_addr(), Duration::from_millis(500)).ok()?;
    stream.set_read_timeout(Some(Duration::from_secs(5))).ok()?;
    stream
        .set_write_timeout(Some(Duration::from_secs(5)))
        .ok()?;
    let authorization = SESSION_TOKEN
        .get()
        .map(|token| format!("Authorization: Bearer {token}\r\n"))
        .unwrap_or_default();
    let request = format!(
        "GET {path} HTTP/1.1\r\nHost: {DASHBOARD_HOST}:{}\r\n{authorization}Accept: application/json\r\nConnection: close\r\n\r\n",
        DASHBOARD_PORT.load(Ordering::Acquire)
    );
    stream.write_all(request.as_bytes()).ok()?;
    let mut raw = String::new();
    stream.read_to_string(&mut raw).ok()?;
    response_body(&raw)
}

fn response_body(response: &str) -> Option<String> {
    let (headers, body) = response.split_once("\r\n\r\n")?;
    let status = headers.lines().next()?.split_whitespace().nth(1)?;
    if status != "200" {
        return None;
    }
    if headers
        .lines()
        .any(|line| line.eq_ignore_ascii_case("transfer-encoding: chunked"))
    {
        return decode_chunked_body(body);
    }
    Some(body.to_string())
}

fn decode_chunked_body(mut encoded: &str) -> Option<String> {
    let mut decoded = String::new();
    loop {
        let (size_line, remainder) = encoded.split_once("\r\n")?;
        let size = usize::from_str_radix(size_line.split(';').next()?.trim(), 16).ok()?;
        if size == 0 {
            return Some(decoded);
        }
        let chunk = remainder.get(..size)?;
        decoded.push_str(chunk);
        encoded = remainder.get(size..)?.strip_prefix("\r\n")?;
    }
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

#[cfg(debug_assertions)]
fn start_dashboard(_app: &tauri::AppHandle, port: u16) -> Result<(), String> {
    let executable = find_fixmind_command().ok_or_else(|| {
        "Could not find the Fixmind CLI on PATH. Install or link `fixmind` first.".to_string()
    })?;
    let mut command = Command::new(executable);
    #[cfg(windows)]
    {
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        command.creation_flags(CREATE_NO_WINDOW);
    }
    let (session_name, session_value) = session_token_environment(
        SESSION_TOKEN
            .get()
            .ok_or("Desktop session token is unavailable.")?,
    );
    let child = command
        .args(development_dashboard_arguments(port))
        .env(session_name, session_value)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|error| format!("Could not launch the Fixmind development dashboard: {error}"))?;
    *DASHBOARD_PROCESS
        .lock()
        .map_err(|_| "Dashboard process lock failed.")? = Some(child);
    Ok(())
}

#[cfg(not(debug_assertions))]
fn start_dashboard(app: &tauri::AppHandle, port: u16) -> Result<(), String> {
    let dashboard_directory = app
        .path()
        .resolve("dashboard", BaseDirectory::Resource)
        .map_err(|error| format!("Could not resolve packaged dashboard resources: {error}"))?;
    let log_file = desktop_log_path(app)?;
    let arguments = packaged_dashboard_arguments(port, &dashboard_directory, &log_file);
    let session_token = SESSION_TOKEN
        .get()
        .ok_or("Desktop session token is unavailable.")?;
    let (session_name, session_value) = session_token_environment(session_token);
    let (mut events, child) = app
        .shell()
        .sidecar("fixmind-server")
        .map_err(|error| format!("Could not resolve the bundled Fixmind server: {error}"))?
        .args(arguments)
        .env(session_name, session_value)
        .spawn()
        .map_err(|error| format!("Could not launch the bundled Fixmind server: {error}"))?;
    *DASHBOARD_PROCESS
        .lock()
        .map_err(|_| "Dashboard process lock failed.")? = Some(child);
    let log_handle = app.clone();
    tauri::async_runtime::spawn(async move {
        while let Some(event) = events.recv().await {
            match event {
                CommandEvent::Stdout(bytes) => {
                    write_desktop_log(&log_handle, &String::from_utf8_lossy(&bytes));
                }
                CommandEvent::Stderr(bytes) => {
                    write_desktop_log(&log_handle, &String::from_utf8_lossy(&bytes));
                }
                CommandEvent::Error(error) => write_desktop_log(&log_handle, &error),
                CommandEvent::Terminated(payload) => {
                    write_desktop_log(&log_handle, &format!("sidecar terminated: {payload:?}"));
                    if should_report_dashboard_exit(SHUTTING_DOWN.load(Ordering::Acquire)) {
                        if let Some(window) = log_handle.get_webview_window("main") {
                            let _ = window.set_title("Fixmind - dashboard stopped");
                        }
                    }
                }
                _ => {}
            }
        }
    });
    Ok(())
}

fn available_port() -> Result<u16, String> {
    let listener = TcpListener::bind((DASHBOARD_HOST, 0))
        .map_err(|error| format!("Could not reserve a dashboard port: {error}"))?;
    listener
        .local_addr()
        .map(|address| address.port())
        .map_err(|error| format!("Could not read the dashboard port: {error}"))
}

#[cfg(any(not(debug_assertions), test))]
fn packaged_dashboard_arguments(
    port: u16,
    dashboard_directory: &Path,
    log_file: &Path,
) -> Vec<String> {
    vec![
        "--port".to_string(),
        port.to_string(),
        "--dashboard-dir".to_string(),
        dashboard_directory.to_string_lossy().into_owned(),
        "--log-file".to_string(),
        log_file.to_string_lossy().into_owned(),
    ]
}

#[cfg(any(debug_assertions, test))]
fn development_dashboard_arguments(port: u16) -> [String; 4] {
    [
        "dashboard".to_string(),
        "--no-open".to_string(),
        "--port".to_string(),
        port.to_string(),
    ]
}

#[cfg(any(not(debug_assertions), test))]
fn should_report_dashboard_exit(shutting_down: bool) -> bool {
    !shutting_down
}

fn session_token_environment(token: &str) -> (&'static str, String) {
    ("FIXMIND_SESSION_TOKEN", token.to_string())
}

fn generate_session_token() -> String {
    rand::random::<[u8; 32]>()
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect()
}

#[cfg(debug_assertions)]
fn stop_dashboard_process() {
    if let Ok(mut process) = DASHBOARD_PROCESS.lock() {
        if let Some(mut child) = process.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

#[cfg(not(debug_assertions))]
fn stop_dashboard_process() {
    let child = DASHBOARD_PROCESS
        .lock()
        .ok()
        .and_then(|mut process| process.take());
    if let Some(mut child) = child {
        let _ = child.write(b"shutdown\n");
        std::thread::sleep(Duration::from_millis(500));
        let _ = child.kill();
    }
}

fn shutdown_dashboard(app: &tauri::AppHandle) {
    SHUTTING_DOWN.store(true, Ordering::Release);
    stop_dashboard_process();
    write_desktop_log(app, "dashboard shutdown completed");
}

fn desktop_log_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let directory = app
        .path()
        .app_log_dir()
        .map_err(|error| format!("Could not resolve the Fixmind log directory: {error}"))?;
    std::fs::create_dir_all(&directory)
        .map_err(|error| format!("Could not create the Fixmind log directory: {error}"))?;
    Ok(directory.join("desktop-server.log"))
}

fn write_desktop_log(app: &tauri::AppHandle, message: &str) {
    let Ok(log_file) = desktop_log_path(app) else {
        return;
    };
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(log_file) {
        let _ = writeln!(file, "{}", message.trim_end());
    }
}

#[cfg(debug_assertions)]
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
    (DASHBOARD_HOST, DASHBOARD_PORT.load(Ordering::Acquire))
        .to_socket_addrs()
        .expect("valid dashboard address")
        .next()
        .expect("dashboard address exists")
}

#[cfg(test)]
mod tests {
    use std::net::TcpListener;
    use std::path::Path;
    use std::time::Duration;

    use super::{
        available_port, classify_startup_error, development_dashboard_arguments,
        generate_session_token, is_fixmind_health_body, packaged_dashboard_arguments,
        response_body, session_token_environment, should_report_dashboard_exit, wait_for_dashboard,
        DASHBOARD_PORT,
    };

    #[test]
    fn reads_chunked_json_response() {
        let response = concat!(
            "HTTP/1.1 200 OK\r\n",
            "Content-Type: application/json\r\n",
            "Transfer-Encoding: chunked\r\n\r\n",
            "a\r\n{\"due\":12}\r\n0\r\n\r\n",
        );
        assert_eq!(response_body(response).as_deref(), Some("{\"due\":12}"));
    }

    #[test]
    fn rejects_unsuccessful_response() {
        let response = "HTTP/1.1 500 Internal Server Error\r\nContent-Length: 2\r\n\r\n{}";
        assert_eq!(response_body(response), None);
    }

    #[test]
    fn health_identity_rejects_unrelated_local_servers() {
        assert!(is_fixmind_health_body(r#"{"service":"fixmind-dashboard"}"#));
        assert!(!is_fixmind_health_body(r#"{"service":"other"}"#));
        assert!(!is_fixmind_health_body("not-json"));
    }

    #[test]
    fn startup_errors_are_classified_for_recovery_copy() {
        assert_eq!(
            classify_startup_error("Could not resolve packaged dashboard resources"),
            "resources"
        );
        assert_eq!(
            classify_startup_error("Permission denied while opening the database"),
            "permissions"
        );
        assert_eq!(classify_startup_error("SQLite database is corrupt"), "data");
        assert_eq!(classify_startup_error("bundled sidecar stopped"), "server");
    }

    #[test]
    fn packaged_sidecar_arguments_preserve_paths_and_port() {
        let arguments = packaged_dashboard_arguments(
            45_678,
            Path::new(r"C:\Program Files\Fixmind\dashboard"),
            Path::new(r"C:\Users\Test User\logs\desktop-server.log"),
        );
        assert_eq!(
            arguments,
            vec![
                "--port",
                "45678",
                "--dashboard-dir",
                r"C:\Program Files\Fixmind\dashboard",
                "--log-file",
                r"C:\Users\Test User\logs\desktop-server.log",
            ]
        );
    }

    #[test]
    fn development_sidecar_arguments_keep_cli_debug_contract() {
        assert_eq!(
            development_dashboard_arguments(4317),
            ["dashboard", "--no-open", "--port", "4317"]
        );
    }

    #[test]
    fn dynamic_port_selection_does_not_reuse_an_occupied_port() {
        let occupied = TcpListener::bind(("127.0.0.1", 0)).expect("reserve test port");
        let occupied_port = occupied.local_addr().expect("read test port").port();
        let selected = available_port().expect("select available port");
        assert_ne!(selected, occupied_port);
    }

    #[test]
    fn generated_session_tokens_are_unlogged_shape_safe_credentials() {
        let token = generate_session_token();
        assert_eq!(token.len(), 64);
        assert!(token.bytes().all(|byte| byte.is_ascii_hexdigit()));
    }

    #[test]
    fn session_token_is_passed_only_through_the_private_environment_name() {
        assert_eq!(
            session_token_environment("secret-token"),
            ("FIXMIND_SESSION_TOKEN", "secret-token".to_string())
        );
    }

    #[test]
    fn dashboard_crash_is_reported_only_when_not_shutting_down() {
        assert!(should_report_dashboard_exit(false));
        assert!(!should_report_dashboard_exit(true));
    }

    #[test]
    fn readiness_timeout_rejects_a_port_without_the_fixmind_service() {
        DASHBOARD_PORT.store(1, std::sync::atomic::Ordering::Release);
        assert!(!wait_for_dashboard(Duration::from_millis(5)));
        DASHBOARD_PORT.store(0, std::sync::atomic::Ordering::Release);
    }
}
