"""
Kafka-assisted in-memory caching layer.

This module provides a reusable cache implementation that keeps local
cache state in-process, while broadcasting invalidation or update events
through Apache Kafka so multiple backend instances stay coherent.

The cache is optional: if Kafka is not configured or available, the system
continues with a local in-memory cache and logs warnings.
"""

import json
import logging
import os
import threading
import time
from typing import Any, Callable, Dict, Optional

try:
    from kafka import KafkaConsumer, KafkaProducer
    from kafka.errors import KafkaError
except ImportError:  # pragma: no cover
    KafkaConsumer = None
    KafkaProducer = None
    KafkaError = Exception

logger = logging.getLogger("app.kafka_cache")
logger.setLevel(logging.DEBUG)

# Ensure logs are printed to console explicitly
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(name)s - %(levelname)s - %(message)s"))
    logger.addHandler(handler)
    logger.propagate = False # Prevent double logging if the root logger eventually gets a handler

KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "")
KAFKA_CACHE_TOPIC = os.getenv("KAFKA_CACHE_TOPIC", "firestore-cache-events")
KAFKA_CONSUMER_GROUP = os.getenv("KAFKA_CACHE_CONSUMER_GROUP", "firestore-cache-group")

_cache_instance = None


def _serialize_message(message: Dict[str, Any]) -> bytes:
    return json.dumps(message, default=str).encode("utf-8")


def _deserialize_message(raw: bytes) -> Dict[str, Any]:
    return json.loads(raw.decode("utf-8"))


class KafkaCache:
    def __init__(self, bootstrap_servers: str = "", topic: str = "firestore-cache-events"):
        self.bootstrap_servers = bootstrap_servers.strip()
        self.topic = topic
        self._producer = None
        self._consumer = None
        self._consumer_thread: Optional[threading.Thread] = None
        self._running = False
        self._cache: Dict[str, Any] = {}
        self._expiry: Dict[str, float] = {}
        self._lock = threading.RLock()

    @property
    def enabled(self) -> bool:
        return bool(self.bootstrap_servers and KafkaProducer is not None)

    def startup(self) -> None:
        if not self.enabled:
            logger.warning("Kafka cache disabled because KAFKA_BOOTSTRAP_SERVERS is not configured or kafka-python is missing.")
            return

        try:
            self._producer = KafkaProducer(
                bootstrap_servers=self.bootstrap_servers,
                value_serializer=lambda v: _serialize_message(v),
            )
            self._consumer = KafkaConsumer(
                self.topic,
                bootstrap_servers=self.bootstrap_servers,
                group_id=KAFKA_CONSUMER_GROUP,
                auto_offset_reset="latest",
                enable_auto_commit=True,
                value_deserializer=lambda v: _deserialize_message(v),
            )
            self._running = True
            self._consumer_thread = threading.Thread(target=self._consume_loop, daemon=True)
            self._consumer_thread.start()
            logger.info("Kafka cache initialized on topic '%s' with brokers '%s'", self.topic, self.bootstrap_servers)
        except KafkaError as exc:
            logger.warning("Unable to initialize Kafka cache: %s", exc)
            self._producer = None
            self._consumer = None
            self._running = False

    def shutdown(self) -> None:
        self._running = False
        if self._consumer is not None:
            try:
                self._consumer.close()
            except Exception:
                pass
            self._consumer = None
        if self._producer is not None:
            try:
                self._producer.flush(timeout=5)
                self._producer.close()
            except Exception:
                pass
            self._producer = None
        logger.info("Kafka cache shut down")

    def _consume_loop(self) -> None:
        if self._consumer is None:
            return

        while self._running:
            try:
                for message in self._consumer.poll(timeout_ms=500, max_records=10).values():
                    for record in message:
                        self._handle_event(record.value)
            except KafkaError as exc:
                logger.warning("Kafka consumer error: %s", exc)
                time.sleep(1)
            except Exception as exc:
                logger.exception("Unexpected Kafka consumer error: %s", exc)
                time.sleep(1)

    def _handle_event(self, event: Dict[str, Any]) -> None:
        action = event.get("action")
        key = event.get("key")
        if not action:
            return

        if action == "invalidate":
            if key:
                self._invalidate_local(key)
                logger.debug("Invalidated cache key from Kafka event: %s", key)
        elif action == "invalidate_prefix":
            prefix = event.get("prefix")
            if prefix:
                self._invalidate_prefix_local(prefix)
                logger.debug("Invalidated cache prefix from Kafka event: %s", prefix)
        elif action == "set":
            if not key:
                return
            value = event.get("value")
            ttl = int(event.get("ttl_secs", 60))
            self._set_local(key, value, ttl, publish=False)
            logger.debug("Synchronized cache key from Kafka event: %s", key)

    def _publish_event(self, event: Dict[str, Any]) -> None:
        if not self.enabled or self._producer is None:
            return

        try:
            self._producer.send(self.topic, event)
            self._producer.flush(timeout=1)
        except KafkaError as exc:
            logger.warning("Failed to publish Kafka cache event: %s", exc)
        except Exception as exc:
            logger.exception("Failed to publish Kafka cache event: %s", exc)

    def _invalidate_prefix_local(self, prefix: str) -> None:
        with self._lock:
            keys = [k for k in self._cache.keys() if k.startswith(prefix)]
            for key in keys:
                self._cache.pop(key, None)
                self._expiry.pop(key, None)

    def invalidate_prefix(self, prefix: str) -> None:
        self._invalidate_prefix_local(prefix)
        if self.enabled:
            self._publish_event({"action": "invalidate_prefix", "prefix": prefix})

    def _set_local(self, key: str, value: Any, ttl_secs: int, publish: bool = True) -> None:
        expiry = time.time() + ttl_secs if ttl_secs else 0.0
        with self._lock:
            self._cache[key] = value
            self._expiry[key] = expiry
        if publish:
            self._publish_event({"action": "set", "key": key, "value": value, "ttl_secs": ttl_secs})

    def _invalidate_local(self, key: str) -> None:
        with self._lock:
            self._cache.pop(key, None)
            self._expiry.pop(key, None)

    def get(self, key: str, loader: Callable[[], Any], ttl_secs: int = 30) -> Any:
        with self._lock:
            expiry = self._expiry.get(key, 0.0)
            if key in self._cache and (expiry == 0.0 or expiry > time.time()):
                logger.debug("Cache hit for key: %s", key)
                return self._cache[key]

        logger.debug("Cache miss for key: %s", key)
        value = loader()
        self._set_local(key, value, ttl_secs)
        return value

    def invalidate(self, key: str) -> None:
        self._invalidate_local(key)
        if self.enabled:
            self._publish_event({"action": "invalidate", "key": key})

    def set(self, key: str, value: Any, ttl_secs: int = 30) -> None:
        self._set_local(key, value, ttl_secs)

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()
            self._expiry.clear()


def get_kafka_cache() -> KafkaCache:
    global _cache_instance
    if _cache_instance is None:
        _cache_instance = KafkaCache(bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS, topic=KAFKA_CACHE_TOPIC)
    return _cache_instance


def initialize_kafka_cache() -> None:
    get_kafka_cache().startup()


def shutdown_kafka_cache() -> None:
    if _cache_instance is not None:
        _cache_instance.shutdown()
