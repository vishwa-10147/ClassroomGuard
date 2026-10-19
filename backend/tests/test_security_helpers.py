import pytest
from backend.app.api.uploads import _parse_range
from backend.app.services.webhook_service import _validate_webhook_url


def test_parse_range_supports_bounded_and_suffix_ranges() -> None:
    assert _parse_range("bytes=2-5", 10) == (2, 5)
    assert _parse_range("bytes=7-", 10) == (7, 9)
    assert _parse_range("bytes=-3", 10) == (7, 9)


@pytest.mark.parametrize("header", ["bytes=10-2", "bytes=10-", "bytes=0-1,3-4", "items=0-1"])
def test_parse_range_rejects_invalid_ranges(header: str) -> None:
    with pytest.raises(ValueError):
        _parse_range(header, 10)


@pytest.mark.parametrize(
    "url",
    [
        "file:///etc/passwd",
        "http://127.0.0.1:8000/internal",
        "http://localhost:8000/internal",
        "https://user:password@example.com/hook",
    ],
)
def test_webhook_url_rejects_unsafe_destinations(url: str) -> None:
    with pytest.raises(ValueError):
        _validate_webhook_url(url)


@pytest.mark.parametrize(
    ("url", "allowed", "ok"),
    [
        ("http://10.20.1.5/hook", [], False),  # campus LAN, not allowed by default
        ("http://10.20.1.5/hook", ["10.20.0.0/16"], True),
        ("http://10.30.1.5/hook", ["10.20.0.0/16"], False),  # another private network
        ("http://192.168.1.10:8080/hook", ["192.168.1.0/24"], True),
        ("http://127.0.0.1/hook", ["127.0.0.0/8"], False),  # loopback is never allowed
        ("http://169.254.169.254/latest", ["169.254.0.0/16"], False),  # cloud metadata
        ("http://8.8.8.8/hook", [], True),
    ],
)
def test_webhook_private_network_allow_list(url: str, allowed: list[str], ok: bool) -> None:
    if ok:
        _validate_webhook_url(url, allowed_networks=allowed)
    else:
        with pytest.raises(ValueError):
            _validate_webhook_url(url, allowed_networks=allowed)


def test_allowed_networks_must_be_valid() -> None:
    from backend.app.core.config import Settings
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        Settings(webhook_allowed_networks=["not-a-network"])
    assert Settings(webhook_allowed_networks=["10.0.0.0/8"]).webhook_allowed_networks == ["10.0.0.0/8"]
