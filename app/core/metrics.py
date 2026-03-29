import threading
from collections import defaultdict, deque

from app.core.config import settings


class MetricsCollector:
    """Thread-safe in-memory request metrics for lightweight export."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._request_count = 0
        self._error_count = 0
        self._path_counts: dict[str, int] = defaultdict(int)
        self._status_counts: dict[str, int] = defaultdict(int)
        self._latencies_ms: deque[float] = deque(maxlen=max(1, settings.metrics_max_samples))

    def record(self, path: str, status_code: int, duration_ms: float) -> None:
        with self._lock:
            self._request_count += 1
            if status_code >= 400:
                self._error_count += 1
            self._path_counts[path] += 1
            self._status_counts[str(status_code)] += 1
            self._latencies_ms.append(duration_ms)

    def snapshot(self) -> dict:
        with self._lock:
            total = self._request_count
            avg_latency = 0.0
            if self._latencies_ms:
                avg_latency = sum(self._latencies_ms) / len(self._latencies_ms)
            p95_latency = 0.0
            if self._latencies_ms:
                ordered = sorted(self._latencies_ms)
                index = max(0, int(len(ordered) * 0.95) - 1)
                p95_latency = ordered[index]

            error_rate = (self._error_count / total) if total else 0.0
            return {
                "requests_total": total,
                "errors_total": self._error_count,
                "error_rate": round(error_rate, 4),
                "latency_ms_avg": round(avg_latency, 3),
                "latency_ms_p95": round(p95_latency, 3),
                "by_path": dict(self._path_counts),
                "by_status": dict(self._status_counts),
            }

    def clear(self) -> None:
        with self._lock:
            self._request_count = 0
            self._error_count = 0
            self._path_counts.clear()
            self._status_counts.clear()
            self._latencies_ms.clear()


metrics_collector = MetricsCollector()
