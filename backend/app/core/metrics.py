from prometheus_client import Counter, Histogram, Gauge, Info

# Request metrics
REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status"],
)
REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds",
    "Request latency",
    ["method", "endpoint"],
    buckets=(0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
)

# Detection metrics
ALERTS_CREATED = Counter(
    "alerts_created_total",
    "Total alerts created",
    ["type", "severity"],
)
ACTIVE_CAMERAS = Gauge("active_cameras", "Number of active cameras")
ACTIVE_ALERTS = Gauge("active_alerts", "Number of unresolved alerts")

# System metrics
GPU_UTILIZATION = Gauge("gpu_utilization_percent", "GPU utilization")
GPU_MEMORY_USED = Gauge("gpu_memory_used_mb", "GPU memory used in MB")
DETECTION_FPS = Gauge("detection_fps", "Current detection FPS")

# Auth metrics
LOGIN_ATTEMPTS = Counter(
    "login_attempts_total",
    "Login attempts",
    ["status"],
)

APP_INFO = Info("classguard", "ClassroomGuard application info")
