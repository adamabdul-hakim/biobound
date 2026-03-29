import threading
import time
from collections import defaultdict, deque


class InMemoryRateLimiter:
    """Simple fixed-window rate limiter keyed by client identifier."""

    def __init__(self) -> None:
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def allow(self, key: str, limit: int, window_seconds: int = 60) -> bool:
        now = time.time()
        threshold = now - window_seconds

        with self._lock:
            bucket = self._events[key]
            while bucket and bucket[0] < threshold:
                bucket.popleft()

            if len(bucket) >= limit:
                return False

            bucket.append(now)
            return True

    def clear(self) -> None:
        with self._lock:
            self._events.clear()


analyze_rate_limiter = InMemoryRateLimiter()
